import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformConfigured } from "@/lib/publishing/providers";
import { verifyWordPress, normalizeSite } from "@/lib/publishing/providers/wordpress";
import { youtubeAuthorizeUrl, isYouTubeConfigured } from "@/lib/publishing/providers/youtube";
import { buildAuthorizeUrl, oauthConfigured } from "@/lib/publishing/oauth";
import { encryptSecret } from "@/lib/security/secrets";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { PLATFORMS } from "@/lib/constants";
import type { SocialPlatform } from "@/lib/types";

/**
 * Social Account Manager (Phase 6 — Module 1).
 * GET  -> list the user's connected accounts.
 * POST -> connect a platform. Real mode returns an OAuth authorize URL;
 *         placeholder mode simulates a connected account so the flow works.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Never expose access_token / refresh_token to the client.
  const { data, error } = await supabase
    .from("social_accounts")
    .select("id, user_id, workspace_id, platform, account_name, account_handle, external_id, scope, status, expires_at, last_synced_at, connected_at, metadata, created_at")
    .order("connected_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "social-connect", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const payload = (await request.json()) as {
    platform: SocialPlatform; siteUrl?: string; username?: string; appPassword?: string;
  };
  const { platform } = payload;
  const meta = PLATFORMS.find((p) => p.id === platform);
  if (!meta) return NextResponse.json({ error: "Unknown platform" }, { status: 400 });

  // WordPress: credential connection via REST API + application password.
  if (platform === "wordpress") {
    const { siteUrl, username, appPassword } = payload;
    if (!siteUrl || !username || !appPassword) {
      return NextResponse.json({ error: "Site URL, username, and application password are required." }, { status: 400 });
    }
    const verified = await verifyWordPress({ siteUrl, username, appPassword });
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });

    const site = normalizeSite(siteUrl);
    const { data, error } = await supabase
      .from("social_accounts")
      .upsert(
        {
          user_id: user.id,
          platform: "wordpress",
          account_name: verified.siteName,
          account_handle: username,
          external_id: site,
          access_token: encryptSecret(appPassword), // encrypted at rest (AES-256-GCM)
          scope: "posts:write",
          status: "connected",
          last_synced_at: new Date().toISOString(),
          connected_at: new Date().toISOString(),
          metadata: { site_url: site, username },
        },
        { onConflict: "user_id,platform,external_id" }
      )
      .select("id, platform, account_name, account_handle, status, connected_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ mode: "wordpress", account: data });
  }

  // YouTube: real Google OAuth2 flow.
  if (platform === "youtube" && isYouTubeConfigured()) {
    return NextResponse.json({ mode: "oauth", authorizeUrl: youtubeAuthorizeUrl(user.id) });
  }

  // LinkedIn / Facebook / Instagram / X / Pinterest / TikTok via the OAuth registry.
  if (oauthConfigured(platform)) {
    const { url, verifier } = buildAuthorizeUrl(platform, user.id);
    const res = NextResponse.json({ mode: "oauth", authorizeUrl: url });
    if (verifier) {
      // PKCE (X): stash the verifier for the callback.
      res.cookies.set(`pkce_${platform}`, verifier, {
        httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
      });
    }
    return res;
  }

  // Configured via legacy env but not wired here.
  if (isPlatformConfigured(platform)) {
    return NextResponse.json({ error: `${meta.name} OAuth isn't available.` }, { status: 501 });
  }

  // Placeholder: simulate a connected account.
  const handle = `@${(user.email ?? "creator").split("@")[0]}_${platform}`;
  const { data, error } = await supabase
    .from("social_accounts")
    .upsert(
      {
        user_id: user.id,
        platform,
        account_name: `${meta.name} (demo)`,
        account_handle: handle,
        external_id: `demo_${platform}_${user.id.slice(0, 8)}`,
        scope: "publish",
        status: "connected",
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
        last_synced_at: new Date().toISOString(),
        connected_at: new Date().toISOString(),
        metadata: { placeholder: true },
      },
      { onConflict: "user_id,platform,external_id" }
    )
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "placeholder", account: data });
}
