/**
 * POST /api/promotion/create
 * Create a promotion campaign for a finished project. Generates AI ad copy
 * (credit-metered) and, for each ad platform, an export-ready campaign package.
 * No ad platform is live yet, so nothing is auto-published — packages are ready
 * to paste into the platform, and clearly labelled as such.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCapability, AD_PLATFORM_DESTINATIONS, type ContentTypeId, type AdPlatformId } from "@/config/publishingCapabilities";
import { generateAdCopy } from "@/lib/ads/generate";
import { getCreditBalance, deductCredits } from "@/lib/credits";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    contentType: ContentTypeId; sourceKind?: string; sourceId?: string;
    title: string; objective?: string; adPlatforms: AdPlatformId[];
    budget?: number; currency?: string; country?: string; audience?: string;
    landingUrl?: string; cta?: string; generateCreative?: boolean;
  };
  const cap = getCapability(body.contentType);
  if (!cap) return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
  if (!body.title) return NextResponse.json({ error: "A title/product is required." }, { status: 400 });
  const platforms = (body.adPlatforms ?? []).filter((p) => p in AD_PLATFORM_DESTINATIONS);
  if (platforms.length === 0) return NextResponse.json({ error: "Select at least one ad platform." }, { status: 400 });

  // Charge for the AI campaign package (once), only if generating creative.
  let charged = 0;
  if (body.generateCreative !== false) {
    const cost = cap.creditEstimate.campaignPackage ?? 8;
    const balance = await getCreditBalance();
    if (balance < cost) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: cost, balance }, { status: 402 });
    const nb = await deductCredits(cost, "promotion_campaign_package");
    if (nb === null) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits" }, { status: 402 });
    charged = cost;
  }

  // Create the campaign.
  const { data: campaign, error: cErr } = await supabase.from("promotion_campaigns").insert({
    user_id: user.id, content_type: body.contentType, source_kind: body.sourceKind ?? null,
    source_id: body.sourceId ?? null, title: body.title, objective: body.objective ?? null,
    status: "ready", budget: body.budget ?? null, currency: body.currency ?? "USD",
    country: body.country ?? null, audience: body.audience ? { description: body.audience } : {},
    landing_url: body.landingUrl ?? null, cta: body.cta ?? null,
  }).select("id").single();
  if (cErr || !campaign) return NextResponse.json({ error: cErr?.message ?? "Could not create campaign" }, { status: 500 });

  // Generate ad copy once (shared across platforms) + store as assets.
  const { pack, usedAI } = await generateAdCopy({
    product: body.title, objective: body.objective, audience: body.audience,
  });
  const assetRows: { user_id: string; campaign_id: string; kind: string; content: string }[] = [];
  const push = (kind: string, items?: string[]) => (items ?? []).slice(0, 6).forEach((c) => assetRows.push({ user_id: user.id, campaign_id: campaign.id, kind, content: c }));
  push("headline", pack.headlines);
  push("primary_text", pack.primaryTexts);
  push("description", pack.descriptions);
  push("cta", pack.ctas);
  push("hook", pack.hooks);
  push("hashtags", pack.hashtags ? [pack.hashtags.join(" ")] : []);
  if (assetRows.length) await supabase.from("promotion_assets").insert(assetRows);

  // One export-ready job per ad platform.
  const jobRows = platforms.map((p) => ({
    user_id: user.id, campaign_id: campaign.id, ad_platform: p, status: "export_ready" as const,
    export_package: {
      platform: AD_PLATFORM_DESTINATIONS[p].label,
      note: `${AD_PLATFORM_DESTINATIONS[p].label} live campaign creation isn't enabled yet. This package is ready to paste into ${AD_PLATFORM_DESTINATIONS[p].label} Ads Manager.`,
      objective: body.objective ?? null, budget: body.budget ?? null, currency: body.currency ?? "USD",
      country: body.country ?? null, audience: body.audience ?? null, landingUrl: body.landingUrl ?? null,
      headlines: pack.headlines?.slice(0, 5) ?? [], primaryTexts: pack.primaryTexts?.slice(0, 3) ?? [],
      descriptions: pack.descriptions?.slice(0, 3) ?? [], ctas: pack.ctas?.slice(0, 3) ?? [],
    },
  }));
  const { data: jobs } = await supabase.from("promotion_jobs").insert(jobRows).select("id, ad_platform, status, export_package");

  await supabase.from("publishing_events").insert({
    user_id: user.id, event_type: "promote.ready", content_type: body.contentType,
    ref_id: body.sourceId ?? null, status: "ready",
    message: `Promotion package ready for ${platforms.length} platform${platforms.length === 1 ? "" : "s"}`,
    metadata: { campaignId: campaign.id },
  });

  return NextResponse.json({ campaignId: campaign.id, usedAI, charged, jobs: jobs ?? [] });
}
