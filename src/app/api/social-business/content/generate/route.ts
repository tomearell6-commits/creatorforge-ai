/**
 * POST /api/social-business/content/generate
 * One idea → platform-specific variations. Creates a content project + variations,
 * credit-metered (base + per platform). Content only — nothing is published here.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeSocial } from "@/lib/social/service";
import { generateSocialVariations, type ContentInput } from "@/lib/social/content";
import { SOCIAL_CREDIT_COSTS, type SocialContentType } from "@/config/socialContentCapabilities";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/config/socialProviderCapabilities";

export const maxDuration = 90;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as ContentInput & { name?: string; platforms?: SocialProviderId[] };
  const platforms = (body.platforms ?? []).filter((p) => p in SOCIAL_PROVIDERS);
  if (platforms.length === 0) return NextResponse.json({ error: "Select at least one platform." }, { status: 400 });
  if (!body.contentType) return NextResponse.json({ error: "Choose a content type." }, { status: 400 });

  const cost = SOCIAL_CREDIT_COSTS.content_base + SOCIAL_CREDIT_COSTS.per_variation * platforms.length;
  const charge = await chargeSocial(cost, "content_generate");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const { data: project, error } = await supabase.from("social_content_projects").insert({
    user_id: user.id, name: body.name || `${body.contentType} campaign`, business: body.business ?? null,
    product: body.product ?? null, goal: body.goal ?? null, audience: body.audience ?? null,
    country: body.country ?? null, language: body.language ?? "English", tone: body.tone ?? null,
    offer: body.offer ?? null, cta: body.cta ?? null, content_type: body.contentType,
    platforms_json: platforms, status: "ready", credits_used: charge.charged,
  }).select("id").single();
  if (error || !project) return NextResponse.json({ error: error?.message ?? "Save failed" }, { status: 500 });

  const variations = await generateSocialVariations(body, platforms);
  await supabase.from("social_content_variations").insert(variations.map((v) => ({
    user_id: user.id, project_id: project.id, platform: v.platform, headline: v.headline, caption: v.caption,
    body: v.body, cta: v.cta, hashtags_json: v.hashtags, image_prompt: v.imagePrompt, video_prompt: v.videoPrompt,
    format: v.format, suggested_time: v.suggestedTime, accessibility_text: v.accessibilityText, compliance_notes: v.complianceNotes,
  })));

  return NextResponse.json({ projectId: project.id, charged: charge.charged, variations });
}
