import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformConfigured } from "@/lib/publishing/providers";
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

  const { data, error } = await supabase
    .from("social_accounts")
    .select("*")
    .order("connected_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform } = (await request.json()) as { platform: SocialPlatform };
  const meta = PLATFORMS.find((p) => p.id === platform);
  if (!meta) return NextResponse.json({ error: "Unknown platform" }, { status: 400 });

  // Real OAuth path (when client id/secret configured): return authorize URL.
  if (isPlatformConfigured(platform)) {
    const redirect = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback?platform=${platform}`;
    return NextResponse.json({
      mode: "oauth",
      authorizeUrl: `https://oauth.${platform}.com/authorize?client_id=${process.env[meta.envClientId]}&redirect_uri=${encodeURIComponent(redirect)}`,
    });
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
