import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { AD_CREDIT_COSTS } from "@/lib/constants";
import { generateAdCopy, willUseRealAdAI } from "@/lib/ads/generate";

/**
 * POST /api/ads/creatives/generate { product, objective?, platform?, audience?, campaignId? }
 * Generates a full ad-copy pack. Charges AD_CREDIT_COSTS.copy only when real AI runs.
 * Saves the lead creative + variations to the campaign when campaignId is given.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "ads-generate", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as { product?: string; objective?: string; platform?: string; audience?: string; campaignId?: string };
  if (!b.product?.trim()) return NextResponse.json({ error: "Describe the product or offer to advertise." }, { status: 400 });

  const billable = willUseRealAdAI();
  const cost = AD_CREDIT_COSTS.copy;
  if (billable && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits", needed: cost }, { status: 402 });
  }

  const { pack, usedAI } = await generateAdCopy({ product: b.product.trim(), objective: b.objective, platform: b.platform, audience: b.audience });
  if (billable && usedAI) await deductCredits(cost, "ad_copy");

  // Persist to a campaign if provided.
  if (b.campaignId) {
    const { data: c } = await supabase.from("ad_campaigns").select("id").eq("id", b.campaignId).eq("user_id", user.id).maybeSingle();
    if (c) {
      await supabase.from("ad_creatives").insert({
        campaign_id: b.campaignId, user_id: user.id,
        headline: pack.headlines[0] ?? null, primary_text: pack.primaryTexts[0] ?? null,
        description: pack.descriptions[0] ?? null, cta: pack.ctas[0] ?? null,
        hashtags: pack.hashtags, image_prompt: pack.imagePrompts[0] ?? null, video_prompt: pack.videoPrompts[0] ?? null,
        variant_label: "A",
      });
      if (pack.variations?.length) {
        await supabase.from("campaign_variations").insert(pack.variations.map((v) => ({
          campaign_id: b.campaignId, user_id: user.id, label: v.label, headline: v.headline, primary_text: v.primaryText, cta: v.cta,
        })));
      }
      await supabase.from("campaign_history").insert({ user_id: user.id, campaign_id: b.campaignId, action: "generated", detail: "AI ad creatives generated." });
    }
  }

  return NextResponse.json({ pack, usedAI, creditCost: billable && usedAI ? cost : 0 });
}
