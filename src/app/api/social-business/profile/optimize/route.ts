/**
 * POST /api/social-business/profile/optimize { provider, current: {bio,about,description,website,category,cta} }
 * Evaluates a platform profile → Profile Health Score + missing info + AI
 * recommendations (suggested bio/description/CTA). NOT a growth/ranking score.
 * Credit-metered. Stored as a profile audit.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeSocial } from "@/lib/social/service";
import { SOCIAL_CREDIT_COSTS } from "@/config/socialContentCapabilities";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/config/socialProviderCapabilities";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
const MODEL = process.env.AI_MODEL || "claude-opus-4-8";
const FIELDS = ["bio", "about", "description", "website", "category", "cta"] as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { provider?: SocialProviderId; accountId?: string; current?: Record<string, string> };
  if (!body.provider || !(body.provider in SOCIAL_PROVIDERS)) return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  const cur = body.current ?? {};

  const charge = await chargeSocial(SOCIAL_CREDIT_COSTS.profile_optimize, "profile_optimize");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const present = FIELDS.filter((f) => (cur[f] ?? "").trim().length > 0);
  const missing = FIELDS.filter((f) => !(cur[f] ?? "").trim());
  const healthScore = Math.round((present.length / FIELDS.length) * 100);

  let suggestions = { bio: cur.bio ?? "", description: cur.description ?? "", cta: cur.cta ?? "Learn more", recommendations: missing.map((m) => `Add your ${m}.`), brandNotes: "Keep name, tone, and links consistent across platforms." };
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const msg = await client.messages.create({
        model: MODEL, max_tokens: 500,
        system: `You optimize a ${SOCIAL_PROVIDERS[body.provider].name} business profile. Return ONLY JSON {"bio":"…","description":"…","cta":"…","recommendations":["…"],"brandNotes":"…"}. Honest, no growth/ranking promises.`,
        messages: [{ role: "user", content: `Current profile: ${JSON.stringify(cur)}\nMissing: ${missing.join(", ") || "none"}` }],
      });
      const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      const p = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      suggestions = { bio: String(p.bio ?? suggestions.bio), description: String(p.description ?? suggestions.description), cta: String(p.cta ?? suggestions.cta), recommendations: Array.isArray(p.recommendations) ? p.recommendations.map(String).slice(0, 8) : suggestions.recommendations, brandNotes: String(p.brandNotes ?? suggestions.brandNotes) };
    } catch { /* fallback */ }
  }

  await supabase.from("social_profile_audits").insert({ user_id: user.id, account_id: body.accountId ?? null, provider: body.provider, health_score: healthScore, missing_json: missing, recommendations_json: suggestions.recommendations, report_json: suggestions, credits_used: charge.charged });

  return NextResponse.json({ provider: body.provider, healthScore, missing, suggestions, charged: charge.charged });
}
