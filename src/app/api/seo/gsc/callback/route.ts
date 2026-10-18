import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/security/secrets";
import { accountEmail, exchangeCode } from "@/lib/gsc/google";

/** Google sends the user back here. We check the state cookie, exchange the code, and store the login ENCRYPTED. */
export async function GET(request: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.creatorsforge.io";
  const back = (q: string) => {
    const r = NextResponse.redirect(`${base}/dashboard/seo/results?${q}`);
    r.cookies.set("gsc_oauth_state", "", { maxAge: 0, path: "/" });
    return r;
  };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) return back(`gsc=error&reason=${encodeURIComponent(error)}`);

  const cookie = request.headers.get("cookie") ?? "";
  const expected = /(?:^|;\s*)gsc_oauth_state=([^;]+)/.exec(cookie)?.[1];
  if (!code || !state || !expected || state !== expected) return back("gsc=error&reason=state");

  try {
    const tok = await exchangeCode(code);
    if (!tok.access_token) return back(`gsc=error&reason=${encodeURIComponent(tok.error ?? "token")}`);
    if (!tok.refresh_token) return back("gsc=error&reason=no_refresh_token");
    if (!(tok.scope ?? "").includes("webmasters")) return back("gsc=error&reason=scope");

    const email = (await accountEmail(tok.access_token)) ?? "unknown";
    const admin = createAdminClient();
    const { error: dbErr } = await admin.from("gsc_connections").upsert({
      user_id: user.id, google_email: email, refresh_token: encryptSecret(tok.refresh_token), access_token: encryptSecret(tok.access_token),
      expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(), scope: tok.scope ?? null,
      status: "connected", last_error: null, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,google_email" });
    if (dbErr) return back("gsc=error&reason=save");
    await admin.from("gsc_cache").delete().eq("user_id", user.id);
    return back("gsc=connected");
  } catch {
    return back("gsc=error&reason=failed");
  }
}
