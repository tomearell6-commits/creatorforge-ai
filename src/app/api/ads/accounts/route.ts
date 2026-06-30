import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AD_PLATFORMS, adPlatform } from "@/lib/constants";

/**
 * Connected advertising accounts. Real ad APIs (Meta Marketing, Google Ads, etc.)
 * require platform-approved app credentials + OAuth; connection is architecture-
 * ready and activates per platform once its env keys are configured. Tokens are
 * never returned to the client.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("connected_ad_accounts")
    .select("id, platform, account_name, external_id, permission_status, connection_status, last_sync_at")
    .eq("user_id", user.id);
  const connected = new Map((data ?? []).map((a) => [a.platform, a]));
  // Return every platform with its connection + whether the server can connect it.
  return NextResponse.json({
    platforms: AD_PLATFORMS.map((p) => ({
      id: p.id, name: p.name, docsUrl: p.docsUrl, supportsPublish: p.supportsPublish, supportsReporting: p.supportsReporting,
      configured: p.envKeys.every((k) => !!process.env[k]),
      account: connected.get(p.id) ?? null,
    })),
  });
}

/** POST { platform } — begin connecting. Gated until the platform's Ads API app is configured. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { platform } = (await request.json().catch(() => ({}))) as { platform?: string };
  const p = platform ? adPlatform(platform) : undefined;
  if (!p) return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
  if (!p.envKeys.every((k) => !!process.env[k])) {
    return NextResponse.json({ error: `${p.name} connection isn't enabled yet. It requires the platform's Ads API app credentials and review. Set ${p.envKeys.join(" + ")} to enable.`, code: "not_configured" }, { status: 400 });
  }
  // When configured, the official OAuth authorize URL would be returned here.
  return NextResponse.json({ ok: true, note: `${p.name} is configured — official OAuth flow would start here.` });
}

/** DELETE ?id= — disconnect an ad account. */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await supabase.from("connected_ad_accounts").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
