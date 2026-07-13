/**
 * GET /api/local-business/callback — Google OAuth callback for Business Profile.
 * Exchanges the code for tokens, stores them ENCRYPTED in local_business_accounts,
 * and returns the user to Settings. Never exposes tokens to the client.
 *
 * Requires GOOGLE_BUSINESS_CLIENT_ID / GOOGLE_BUSINESS_CLIENT_SECRET. NOTE: live
 * Business Profile API reads/writes additionally require Google's approved access
 * to the Business Profile APIs — OAuth alone is not enough.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/security/secrets";
import { fetchWithTimeout } from "@/lib/http";
import { logLbConnection } from "@/lib/local-business/service";

const SETTINGS = "/dashboard/grow/local-business/settings";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.creatorsforge.io";
  if (!user) return NextResponse.redirect(`${base}/login`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  if (error || !code) {
    await logLbConnection(supabase, user.id, null, "connect_failed", error ?? "no code");
    return NextResponse.redirect(`${base}${SETTINGS}?gbp=error`);
  }

  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(`${base}${SETTINGS}?gbp=unconfigured`);

  try {
    const tokenRes = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: `${base}/api/local-business/callback`, grant_type: "authorization_code" }),
    }, 20_000);
    const tok = await tokenRes.json();
    if (!tokenRes.ok || !tok.access_token) {
      await logLbConnection(supabase, user.id, null, "connect_failed", tok.error ?? "token exchange failed");
      return NextResponse.redirect(`${base}${SETTINGS}?gbp=error`);
    }

    // Fetch the Google account email (best-effort).
    let email: string | null = null;
    try {
      const info = await fetchWithTimeout("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } }, 10_000);
      if (info.ok) email = (await info.json())?.email ?? null;
    } catch { /* optional */ }

    const expiresAt = tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null;
    const { data: acct } = await supabase.from("local_business_accounts").insert({
      user_id: user.id, google_email: email, access_token: encryptSecret(tok.access_token),
      refresh_token: tok.refresh_token ? encryptSecret(tok.refresh_token) : null, scope: tok.scope ?? null,
      status: "connected", expires_at: expiresAt, last_success_at: new Date().toISOString(),
    }).select("id").single();
    await logLbConnection(supabase, user.id, acct?.id ?? null, "connect", email ?? undefined);

    return NextResponse.redirect(`${base}${SETTINGS}?gbp=connected`);
  } catch (e) {
    await logLbConnection(supabase, user.id, null, "connect_failed", e instanceof Error ? e.message : "error");
    return NextResponse.redirect(`${base}${SETTINGS}?gbp=error`);
  }
}
