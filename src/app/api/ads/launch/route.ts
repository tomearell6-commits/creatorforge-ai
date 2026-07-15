/**
 * POST /api/ads/launch — prepare a campaign for launch on each chosen platform.
 *
 * Real ad publishing (Meta Marketing API / Google Ads API) is heavily gated —
 * platform-approved app + the user's ad account + billing — and spends real
 * money, so it activates per-platform only once its Ads API app is configured
 * AND the ad account is connected. Until then we produce an honest, ready-to-
 * launch EXPORT PACKAGE per platform (objective, targeting, budget, ad copy,
 * creative) plus a deep link into that platform's Ads Manager. We NEVER simulate
 * a live ad or spend money. Free (launching/exporting isn't a paid AI action).
 */
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AD_PLATFORMS, adPlatform, AD_OBJECTIVES } from "@/lib/constants";

type Budget = { type?: "daily" | "lifetime"; amount?: number; currency?: string };
type Schedule = { start?: string | null; end?: string | null };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    campaignId?: string; platforms?: string[]; budget?: Budget; schedule?: Schedule; authorized?: boolean;
  };
  if (!body.campaignId) return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
  // Spending real money must be explicitly authorized after review.
  if (body.authorized !== true) {
    return NextResponse.json({ error: "Confirm you've reviewed the targeting and budget and authorize the ad spend.", code: "not_authorized" }, { status: 400 });
  }

  const { data: campaign } = await supabase.from("ad_campaigns").select("*").eq("id", body.campaignId).eq("user_id", user.id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const targetPlatforms: string[] = (body.platforms?.length ? body.platforms : (campaign.platforms as string[])) ?? [];
  if (!targetPlatforms.length) return NextResponse.json({ error: "Choose at least one platform to launch on." }, { status: 400 });

  const { data: creatives } = await supabase.from("ad_creatives")
    .select("headline, primary_text, description, cta, image_url, video_url, variant_label")
    .eq("campaign_id", body.campaignId).eq("archived", false);
  const { data: accounts } = await supabase.from("connected_ad_accounts")
    .select("platform, account_name, connection_status").eq("user_id", user.id);
  const connectedBy = new Map((accounts ?? []).map((a) => [a.platform, a]));

  const objectiveLabel = AD_OBJECTIVES.find((o) => o.id === campaign.objective)?.label ?? campaign.objective;
  const budget: Budget = { type: body.budget?.type ?? "daily", amount: body.budget?.amount, currency: body.budget?.currency ?? "USD" };
  const schedule: Schedule = { start: body.schedule?.start ?? null, end: body.schedule?.end ?? null };

  const packages = targetPlatforms.map((platformId) => {
    const p = adPlatform(platformId);
    const configured = !!p && p.envKeys.every((k) => !!process.env[k]);
    const connected = !!connectedBy.get(platformId);
    // Live auto-publishing needs BOTH the Ads API app configured AND a connected
    // ad account. No platform is live yet, so every launch is an export package.
    const live = false;
    return {
      platform: platformId,
      platformName: p?.name ?? platformId,
      status: (live && configured && connected ? "published" : "export_ready") as "published" | "export_ready",
      configured,
      connected,
      managerUrl: p?.managerUrl ?? null,
      docsUrl: p?.docsUrl ?? null,
      package: {
        campaign: campaign.name,
        objective: objectiveLabel,
        audience: campaign.audience ?? {},
        budget,
        schedule,
        creatives: (creatives ?? []).map((c) => ({
          variant: c.variant_label ?? null, headline: c.headline, primaryText: c.primary_text,
          description: c.description, cta: c.cta, imageUrl: c.image_url, videoUrl: c.video_url,
        })),
        note: connected
          ? `${p?.name ?? platformId}: automatic publishing activates once ${p?.name ?? platformId} Ads API access is approved for CreatorsForge. For now, open Ads Manager and paste this launch brief — everything is ready.`
          : `Connect your ${p?.name ?? platformId} ad account (Manage → Ad Accounts) for one-click publishing later. For now, open Ads Manager and use this launch brief.`,
      },
    };
  });

  // Persist the launch intent on the campaign (no schema change — stored in metadata).
  const meta = { ...(campaign.metadata as Record<string, unknown> ?? {}), launch: { budget, schedule, platforms: targetPlatforms, authorized_at: new Date().toISOString() } };
  await supabase.from("ad_campaigns").update({
    metadata: meta,
    status: schedule.start ? "scheduled" : "draft",
    updated_at: new Date().toISOString(),
  }).eq("id", body.campaignId).eq("user_id", user.id);
  await supabase.from("campaign_history").insert({
    user_id: user.id, campaign_id: body.campaignId, action: "launch_prepared",
    detail: `Launch package prepared for ${targetPlatforms.length} platform(s).`,
  }).then(() => {}, () => {});

  return NextResponse.json({
    ok: true, exportOnly: true, packages,
    message: "Your launch package is ready. Open each platform's Ads Manager and paste the brief — automatic publishing will activate per platform once its Ads API is approved and your ad account is connected.",
  });
}
