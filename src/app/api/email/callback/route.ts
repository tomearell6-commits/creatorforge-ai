import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCode, providerFamily, type EmailProviderId } from "@/lib/email-assistant/providers";
import { storeTokens } from "@/lib/email-assistant/tokens";

export const dynamic = "force-dynamic";

/**
 * GET /api/email/callback — OAuth redirect target for Gmail/Outlook.
 * Verifies the state cookie, exchanges the code, creates the account record,
 * and stores ENCRYPTED tokens via the service role. Redirects back to the
 * Email Assistant with a status flag; tokens never touch the client.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const back = (q: string) => NextResponse.redirect(`${url.origin}/dashboard/email?${q}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return back("error=not_signed_in");

  const jar = await cookies();
  const raw = jar.get("email_oauth_state")?.value;
  jar.delete("email_oauth_state");
  if (!code || !state || !raw) return back("error=missing_state");

  let saved: { state: string; provider: EmailProviderId; mode: string };
  try { saved = JSON.parse(raw); } catch { return back("error=bad_state"); }
  if (saved.state !== state) return back("error=state_mismatch");

  try {
    const family = providerFamily(saved.provider);
    if (family !== "google" && family !== "microsoft") return back("error=unsupported");
    const tokens = await exchangeCode(family, code);
    const email = tokens.email ?? `${saved.provider}-account`;

    const { data: account, error } = await supabase
      .from("email_accounts")
      .upsert(
        {
          user_id: user.id, provider: saved.provider, email_address: email,
          permission_mode: saved.mode, status: "connected",
          consent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider,email_address" }
      )
      .select("id")
      .single();
    if (error || !account) return back("error=account_save_failed");

    // Tokens go through the service role — the tokens table has no RLS policies.
    await storeTokens(createAdminClient(), account.id, user.id, tokens);
    await supabase.from("email_activity_logs").insert({ user_id: user.id, account_id: account.id, action: "connect", detail: saved.provider });

    return back("connected=1");
  } catch (e) {
    return back(`error=${encodeURIComponent(e instanceof Error ? e.message.slice(0, 80) : "exchange_failed")}`);
  }
}
