import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { youtubeExchangeCode, youtubeChannel } from "@/lib/publishing/providers/youtube";
import { encryptSecret } from "@/lib/security/secrets";
import { captureError } from "@/lib/logger";

/**
 * OAuth callback (Phase 8 GA — real social OAuth). Currently handles YouTube:
 * exchanges the code, fetches the channel, and stores the connection with the
 * refresh token encrypted at rest. Redirects back to Social Accounts.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform");
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const back = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social`;

  if (oauthError) return NextResponse.redirect(`${back}?error=${encodeURIComponent(oauthError)}`);
  if (platform !== "youtube" || !code) return NextResponse.redirect(`${back}?error=invalid_callback`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);

  try {
    const tokens = await youtubeExchangeCode(code);
    const channel = await youtubeChannel(tokens.accessToken);

    await supabase.from("social_accounts").upsert(
      {
        user_id: user.id,
        platform: "youtube",
        account_name: channel.title,
        account_handle: channel.title,
        external_id: channel.id,
        access_token: encryptSecret(tokens.accessToken),
        refresh_token: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
        scope: "youtube.upload",
        status: "connected",
        expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
        last_synced_at: new Date().toISOString(),
        connected_at: new Date().toISOString(),
        metadata: { channel_id: channel.id },
      },
      { onConflict: "user_id,platform,external_id" }
    );

    return NextResponse.redirect(`${back}?connected=youtube`);
  } catch (err) {
    captureError(err, { category: "publishing", platform: "youtube", stage: "oauth_callback" });
    return NextResponse.redirect(`${back}?error=youtube_connect_failed`);
  }
}
