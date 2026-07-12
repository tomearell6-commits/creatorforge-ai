/**
 * POST /api/promotion/prepare-ad
 * Generate / refresh an export-ready ad package for ONE ad platform on an
 * existing campaign. Credit-metered (ad creative). Never auto-publishes.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AD_PLATFORM_DESTINATIONS, type AdPlatformId } from "@/config/publishingCapabilities";
import { generateAdCopy } from "@/lib/ads/generate";
import { getCreditBalance, deductCredits } from "@/lib/credits";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { campaignId: string; adPlatform: AdPlatformId };
  if (!(body.adPlatform in AD_PLATFORM_DESTINATIONS)) return NextResponse.json({ error: "Unknown ad platform" }, { status: 400 });

  const { data: campaign } = await supabase
    .from("promotion_campaigns")
    .select("id, title, objective, budget, currency, country, audience, landing_url")
    .eq("id", body.campaignId).single();
  if (!campaign) return NextResponse.json({ error: "Campaign not found or not yours." }, { status: 404 });

  const cost = 5; // ad creative
  const balance = await getCreditBalance();
  if (balance < cost) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: cost, balance }, { status: 402 });
  const nb = await deductCredits(cost, "promotion_ad_creative");
  if (nb === null) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits" }, { status: 402 });

  const audience = (campaign.audience as { description?: string })?.description;
  const { pack } = await generateAdCopy({ product: campaign.title, objective: campaign.objective ?? undefined, audience });
  const meta = AD_PLATFORM_DESTINATIONS[body.adPlatform];
  const pkg = {
    platform: meta.label,
    note: `${meta.label} live campaign creation isn't enabled yet. This package is ready to paste into ${meta.label} Ads Manager.`,
    objective: campaign.objective, budget: campaign.budget, currency: campaign.currency,
    country: campaign.country, landingUrl: campaign.landing_url,
    headlines: pack.headlines?.slice(0, 5) ?? [], primaryTexts: pack.primaryTexts?.slice(0, 3) ?? [],
    descriptions: pack.descriptions?.slice(0, 3) ?? [], ctas: pack.ctas?.slice(0, 3) ?? [],
  };

  // Upsert one job per (campaign, platform).
  const { data: existing } = await supabase
    .from("promotion_jobs").select("id").eq("campaign_id", campaign.id).eq("ad_platform", body.adPlatform).maybeSingle();
  if (existing) {
    await supabase.from("promotion_jobs").update({ status: "export_ready", export_package: pkg, credits_charged: cost }).eq("id", existing.id);
  } else {
    await supabase.from("promotion_jobs").insert({ user_id: user.id, campaign_id: campaign.id, ad_platform: body.adPlatform, status: "export_ready", export_package: pkg, credits_charged: cost });
  }

  return NextResponse.json({ charged: cost, package: pkg });
}
