import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { youtubeExchangeCode, youtubeChannel } from "@/lib/publishing/providers/youtube";
import { oauthConfigured, oauthExchange, type ConnectionData } from "@/lib/publishing/oauth";
import { encryptSecret } from "@/lib/security/secrets";
import { captureError } from "@/lib/logger";
import type { SocialPlatform } from "@/lib/types";

/**
 * OAuth callback (Phase 8 GA). Handles YouTube + all OAuth-registry platforms
 * (LinkedIn/Facebook/Instagram/X/Pinterest/TikTok): exchanges the code, fetches
 * the account, and stores the connection with tokens encrypted at rest.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") as SocialPlatform | null;
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const back = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social`;

  if (oauthError) return NextResponse.redirect(`${back}?error=${encodeURIComponent(oauthError)}`);
  if (!platform || !code) return NextResponse.redirect(`${back}?error=invalid_callback`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);

  try {
    let conn: ConnectionData;

    if (platform === "youtube") {
      const tokens = await youtubeExchangeCode(code);
      const channel = await youtubeChannel(tokens.accessToken);
      conn = {
        accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: tokens.expiresIn,
        externalId: channel.id, accountName: channel.title, metadata: { channel_id: channel.id },
      };
    } else if (oauthConfigured(platform)) {
      // PKCE verifier (X) from the cookie set during authorize.
      const verifier = request.headers.get("cookie")?.match(new RegExp(`pkce_${platform}=([^;]+)`))?.[1];
      conn = await oauthExchange(platform, code, { verifier: verifier ? decodeURIComponent(verifier) : undefined });
    } else {
      return NextResponse.redirect(`${back}?error=not_configured`);
    }

    const { error: upsertError } = await supabase.from("social_accounts").upsert(
      {
        user_id: user.id,
        platform,
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
    // Don't report a false success: if the row didn't save, surface the reason.
    if (upsertError) {
      captureError(upsertError, { category: "publishing", platform, stage: "oauth_upsert" });
      return NextResponse.redirect(`${back}?error=${platform}_connect_failed&detail=${encodeURIComponent(`Saved-to-account failed: ${upsertError.message}`.slice(0, 300))}`);
    }

    const res = NextResponse.redirect(`${back}?connected=${platform}`);
    res.cookies.delete(`pkce_${platform}`);
    return res;
  } catch (err) {
    captureError(err, { category: "publishing", platform, stage: "oauth_callback" });
    const detail = err instanceof Error ? err.message : "";
    return NextResponse.redirect(`${back}?error=${platform}_connect_failed&detail=${encodeURIComponent(detail.slice(0, 300))}`);
  }
}
