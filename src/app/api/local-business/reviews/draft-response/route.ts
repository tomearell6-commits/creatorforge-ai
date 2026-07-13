/**
 * POST /api/local-business/reviews/draft-response { reviewId, tone }
 * Drafts a professional review response with safety rules. Never auto-publishes;
 * negative reviews + high-risk content are flagged for human review. Credit-metered.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeLb } from "@/lib/local-business/service";
import { LB_REVIEW_TONES, type LbReviewTone } from "@/config/localBusiness";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
const MODEL = process.env.AI_MODEL || "claude-opus-4-8";
const RISK = /\b(lawsuit|sue|lawyer|legal action|discriminat|racist|sexist|threat|kill|violence|scam|fraud)\b/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId, tone } = (await request.json().catch(() => ({}))) as { reviewId?: string; tone?: LbReviewTone };
  if (!reviewId) return NextResponse.json({ error: "reviewId is required." }, { status: 400 });
  const selectedTone = LB_REVIEW_TONES.includes(tone as LbReviewTone) ? tone! : "professional";

  const { data: review } = await supabase.from("local_business_reviews").select("id, location_id, rating, comment, reviewer_name").eq("id", reviewId).single();
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  const charge = await chargeLb("review_reply");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const isNegative = (review.rating ?? 5) <= 3;
  const isHighRisk = RISK.test(review.comment ?? "");

  let draft = "";
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const msg = await client.messages.create({
        model: MODEL, max_tokens: 300,
        system: `You draft Google review responses for a business owner. Tone: ${selectedTone}. Rules: be respectful; never argue; never reveal private customer info; never promise compensation or refunds; thank the reviewer; for negative reviews, apologize sincerely and invite them to continue offline. Return ONLY the response text.`,
        messages: [{ role: "user", content: `Reviewer: ${review.reviewer_name}\nRating: ${review.rating}/5\nReview: ${review.comment}` }],
      });
      draft = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    } catch { draft = ""; }
  }
  if (!draft) draft = `Thank you for your feedback, ${review.reviewer_name}. We appreciate you taking the time to share it and would be glad to help further — please reach out to us directly.`;

  const needsHuman = isNegative || isHighRisk;
  const { data: rec } = await supabase.from("local_business_review_drafts").insert({
    user_id: user.id, review_id: reviewId, location_id: review.location_id, tone: selectedTone,
    draft_text: draft, status: isHighRisk ? "flagged" : "draft", needs_human: needsHuman,
  }).select("id").single();

  return NextResponse.json({
    id: rec?.id, draft, tone: selectedTone, needsHuman, isNegative, isHighRisk, charged: charge.charged,
    notice: isHighRisk ? "This review contains sensitive content — a human must review before responding."
      : isNegative ? "Negative review — please review and approve manually before publishing." : null,
  });
}
