/**
 * POST /api/social-business/replies/draft { inboxItemId, tone }
 * Drafts a professional reply. Safety: high-risk topics (legal/refund/dispute/
 * complaint/financial/security/sensitive/crisis) are FLAGGED for manual approval
 * and never auto-sent. Credit-metered.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeSocial } from "@/lib/social/service";
import { SOCIAL_CREDIT_COSTS } from "@/config/socialContentCapabilities";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
const MODEL = process.env.AI_MODEL || "claude-opus-4-8";
const HIGH_RISK = /\b(refund|lawsuit|sue|lawyer|legal|dispute|chargeback|fraud|scam|hack|breach|security|complaint|discriminat|threat|harass|crisis|dangerous|injury|lawsuit)\b/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { inboxItemId, tone } = (await request.json().catch(() => ({}))) as { inboxItemId?: string; tone?: string };
  if (!inboxItemId) return NextResponse.json({ error: "inboxItemId is required." }, { status: 400 });

  const { data: item } = await supabase.from("social_inbox_items").select("id, provider, author, text, classification").eq("id", inboxItemId).single();
  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  const charge = await chargeSocial(SOCIAL_CREDIT_COSTS.reply_draft, "reply_draft");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const highRisk = HIGH_RISK.test(item.text ?? "") || item.classification === "complaint" || item.classification === "urgent";
  const selectedTone = tone || "professional";

  let draft = "";
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const msg = await client.messages.create({
        model: MODEL, max_tokens: 300,
        system: `You draft social media replies for a business. Tone: ${selectedTone}. Rules: respectful; never argue; never reveal private info; never promise refunds/compensation or make legal/financial commitments; for complaints, apologize and invite the person to continue privately. Return ONLY the reply text.`,
        messages: [{ role: "user", content: `Platform: ${item.provider}\nFrom: ${item.author}\nMessage: ${item.text}` }],
      });
      draft = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    } catch { draft = ""; }
  }
  if (!draft) draft = `Thanks for reaching out, ${item.author}! We appreciate it and would be glad to help — please send us a direct message and we'll follow up.`;

  const { data: rec } = await supabase.from("social_reply_drafts").insert({
    user_id: user.id, inbox_item_id: inboxItemId, tone: selectedTone, draft_text: draft,
    status: highRisk ? "flagged" : "draft", needs_human: highRisk,
  }).select("id").single();

  return NextResponse.json({
    id: rec?.id, draft, tone: selectedTone, needsHuman: highRisk, charged: charge.charged,
    notice: highRisk ? "This looks sensitive (complaint/legal/financial/urgent) — a human must review and approve before sending." : null,
  });
}
