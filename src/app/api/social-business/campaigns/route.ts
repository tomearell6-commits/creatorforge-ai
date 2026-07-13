/**
 * GET  /api/social-business/campaigns — list campaigns (free)
 * POST /api/social-business/campaigns — create a multi-channel campaign: builds a
 *      content project + platform-specific variations + a summary. Credit-metered.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeSocial } from "@/lib/social/service";
import { generateSocialVariations, type ContentInput } from "@/lib/social/content";
import { SOCIAL_CREDIT_COSTS, type SocialContentType } from "@/config/socialContentCapabilities";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/config/socialProviderCapabilities";

export const maxDuration = 120;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("social_campaigns").select("id, name, goal, platforms_json, status, approval_mode, created_at").order("created_at", { ascending: false }).limit(50);
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string; goal?: string; audience?: string; platforms?: SocialProviderId[]; contentType?: SocialContentType;
    business?: string; product?: string; tone?: string; offer?: string; cta?: string; approvalMode?: string; budget?: number;
  };
  const platforms = (body.platforms ?? []).filter((p) => p in SOCIAL_PROVIDERS);
  if (!body.name) return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
  if (platforms.length === 0) return NextResponse.json({ error: "Select at least one platform." }, { status: 400 });

  const charge = await chargeSocial(SOCIAL_CREDIT_COSTS.campaign, "campaign");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const { data: campaign, error } = await supabase.from("social_campaigns").insert({
    user_id: user.id, name: body.name, goal: body.goal ?? null, audience: body.audience ?? null,
    platforms_json: platforms, approval_mode: body.approvalMode ?? "assisted", budget: body.budget ?? null,
    status: "ready", summary: `Multi-platform ${body.goal ?? "campaign"} across ${platforms.length} platform(s).`,
  }).select("id").single();
  if (error || !campaign) return NextResponse.json({ error: error?.message ?? "Save failed" }, { status: 500 });

  const contentInput: ContentInput = { business: body.business, product: body.product, goal: body.goal, audience: body.audience, tone: body.tone, offer: body.offer, cta: body.cta, contentType: (body.contentType ?? "announcement") as SocialContentType };
  const { data: project } = await supabase.from("social_content_projects").insert({
    user_id: user.id, campaign_id: campaign.id, name: body.name, business: body.business ?? null, product: body.product ?? null,
    goal: body.goal ?? null, audience: body.audience ?? null, tone: body.tone ?? null, offer: body.offer ?? null, cta: body.cta ?? null,
    content_type: contentInput.contentType, platforms_json: platforms, status: "ready", credits_used: charge.charged,
  }).select("id").single();

  const variations = await generateSocialVariations(contentInput, platforms);
  if (project) {
    await supabase.from("social_content_variations").insert(variations.map((v) => ({
      user_id: user.id, project_id: project.id, platform: v.platform, headline: v.headline, caption: v.caption, body: v.body,
      cta: v.cta, hashtags_json: v.hashtags, image_prompt: v.imagePrompt, video_prompt: v.videoPrompt, format: v.format,
      suggested_time: v.suggestedTime, accessibility_text: v.accessibilityText, compliance_notes: v.complianceNotes,
    })));
    await supabase.from("social_campaign_items").insert(platforms.map((p) => ({ user_id: user.id, campaign_id: campaign.id, project_id: project.id, platform: p, status: "draft" })));
  }

  return NextResponse.json({ campaignId: campaign.id, projectId: project?.id, charged: charge.charged, variations });
}
