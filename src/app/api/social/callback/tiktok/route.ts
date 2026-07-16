/**
 * TikTok OAuth callback — dedicated path because TikTok forbids query parameters
 * in redirect URIs (the shared /api/social/callback uses ?platform=). Exchanges
 * the code, stores the connection with tokens encrypted at rest, and returns to
 * the Social Accounts page. Surfaces the real error on failure.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { oauthConfigured, oauthExchange } from "@/lib/publishing/oauth";
import { encryptSecret } from "@/lib/security/secrets";
import { captureError } from "@/lib/logger";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const back = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social`;

  if (oauthError) return NextResponse.redirect(`${back}?error=${encodeURIComponent(oauthError)}`);
  if (!code) return NextResponse.redirect(`${back}?error=invalid_callback`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);

  try {
    if (!oauthConfigured("tiktok")) return NextResponse.redirect(`${back}?error=not_configured`);
    const conn = await oauthExchange("tiktok", code, {});

    const { error: upsertError } = await supabase.from("social_accounts").upsert(
      {
        user_id: user.id,
        platform: "tiktok",
        account_name: conn.accountName,
        account_handle: conn.accountName,
        external_id: conn.externalId,
        access_token: encryptSecret(conn.accessToken),
        refresh_token: conn.refreshToken ? encryptSecret(conn.refreshToken) : null,
        scope: "publish",
        status: "connected",
        expires_at: conn.expiresIn ? new Date(Date.now() + conn.expiresIn * 1000).toISOString() : null,
        last_synced_at: new Date().toISOString(),
        connected_at: new Date().toISOString(),
        metadata: conn.metadata ?? {},
      },
      { onConflict: "user_id,platform,external_id" }
    );
    if (upsertError) {
      captureError(upsertError, { category: "publishing", platform: "tiktok", stage: "oauth_upsert" });
      return NextResponse.redirect(`${back}?error=tiktok_connect_failed&detail=${encodeURIComponent(`Saved-to-account failed: ${upsertError.message}`.slice(0, 300))}`);
    }
    return NextResponse.redirect(`${back}?connected=tiktok`);
  } catch (err) {
    captureError(err, { category: "publishing", platform: "tiktok", stage: "oauth_callback" });
    const detail = err instanceof Error ? err.message : "";
    return NextResponse.redirect(`${back}?error=tiktok_connect_failed&detail=${encodeURIComponent(detail.slice(0, 300))}`);
  }
}
