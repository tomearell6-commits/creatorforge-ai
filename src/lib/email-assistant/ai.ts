/**
 * AI classification + draft generation for the Email Assistant.
 * Claude when ANTHROPIC_API_KEY is set; deterministic keyword placeholder
 * otherwise (free — no credits charged). Placeholder heuristics also serve
 * as the fallback when Claude output fails to parse.
 */
import Anthropic from "@anthropic-ai/sdk";
import { isSensitiveEmail, type DraftTone, type EmailCategory, type EmailPriority } from "./safety";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export function willUseRealEmailAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export type EmailInput = { fromName?: string | null; fromAddress?: string | null; subject?: string | null; body?: string | null };

export type Classification = {
  category: EmailCategory;
  priority: EmailPriority;
  summary: string;
  needsReply: boolean;
  isSensitive: boolean;
  attentionReason: string | null;   // null = doesn't need attention
  suggestedAction: string | null;
  deadline: string | null;          // YYYY-MM-DD when detected
};

// ---- Placeholder heuristics -------------------------------------------------
function classifyHeuristic(email: EmailInput): Classification {
  const text = `${email.subject ?? ""} ${email.body ?? ""}`.toLowerCase();
  const has = (...words: string[]) => words.some((w) => text.includes(w));

  let category: EmailCategory = "needs_reply";
  let priority: EmailPriority = "medium";
  if (has("newsletter", "digest", "roundup", "unsubscribe")) { category = "newsletter"; priority = "low"; }
  else if (has("invoice", "payment", "billing", "due")) { category = "billing"; priority = "high"; }
  else if (has("urgent", "asap", "deadline", "eod", "immediately")) { category = "urgent"; priority = "critical"; }
  else if (has("problem", "issue", "help", "broken", "not working", "corrupted")) { category = "support"; priority = "high"; }
  else if (has("pricing", "interested in", "quote", "plan for")) { category = "sales_lead"; priority = "high"; }
  else if (has("partnership", "collaborate", "co-marketing")) { category = "partnership"; priority = "medium"; }

  const needsReply = !["newsletter", "low_priority"].includes(category);
  const sensitive = isSensitiveEmail({ subject: email.subject, body: email.body, category });
  const needsAttention = priority === "critical" || priority === "high";
  return {
    category, priority,
    summary: `${email.fromName ?? email.fromAddress ?? "Sender"}: ${(email.subject ?? "").slice(0, 80)} — ${(email.body ?? email.subject ?? "").slice(0, 120)}`,
    needsReply, isSensitive: sensitive,
    attentionReason: needsAttention
      ? category === "support" ? "Customer reporting a problem — response expected quickly."
        : category === "billing" ? "Payment-related email — review before the due date."
        : category === "sales_lead" ? "Potential customer asking about your product."
        : "Marked urgent by the sender."
      : null,
    suggestedAction: needsAttention ? (needsReply ? "Reply today" : "Review today") : null,
    deadline: null,
  };
}

function draftHeuristic(email: EmailInput, tone: DraftTone): string {
  const name = email.fromName?.split(" ")[0] ?? "there";
  const openers: Record<DraftTone, string> = {
    professional: `Hi ${name},\n\nThank you for your email.`,
    friendly: `Hey ${name}!\n\nThanks so much for reaching out.`,
    direct: `Hi ${name},`,
    apologetic: `Hi ${name},\n\nI'm sorry for the trouble this has caused.`,
    sales: `Hi ${name},\n\nThanks for your interest — great to hear from you!`,
    support: `Hi ${name},\n\nThanks for flagging this — I'm on it.`,
  };
  return `${openers[tone]}\n\nRegarding "${email.subject ?? "your message"}": I've reviewed it and will get back to you with the details shortly. If there's a deadline I should know about, just let me know.\n\nBest regards`;
}

// ---- Claude ------------------------------------------------------------------
async function callClaude<T>(system: string, payload: unknown, maxTokens = 1200): Promise<T> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const msg = await client.messages.create({
    model: MODEL, max_tokens: maxTokens, system,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });
  const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("")
    .trim().replace(/^```json?/i, "").replace(/```$/, "");
  return JSON.parse(text) as T;
}

export async function classifyEmail(email: EmailInput): Promise<{ result: Classification; usedAI: boolean }> {
  if (!willUseRealEmailAI()) return { result: classifyHeuristic(email), usedAI: false };
  try {
    const r = await callClaude<Classification>(
      "You are an executive email triage assistant. Return ONLY minified JSON: " +
        "{category('urgent'|'needs_reply'|'waiting'|'support'|'sales_lead'|'billing'|'partnership'|'newsletter'|'low_priority'|'personal'|'follow_up')," +
        "priority('critical'|'high'|'medium'|'low'),summary(1-2 sentences),needsReply(bool),isSensitive(bool: legal/financial/security/medical/government/dispute/refund/complaint topics)," +
        "attentionReason(string or null when no attention needed),suggestedAction(string or null),deadline('YYYY-MM-DD' or null, only when explicitly stated or clearly implied)}. No commentary.",
      email
    );
    // Defense-in-depth: our keyword blocklist can only ADD sensitivity, never remove it.
    r.isSensitive = r.isSensitive || isSensitiveEmail({ subject: email.subject, body: email.body, category: r.category });
    return { result: r, usedAI: true };
  } catch {
    return { result: classifyHeuristic(email), usedAI: false };
  }
}


/**
 * Batch classification — ALL emails in ONE Claude call (a 25-email inbox scan
 * must finish well inside the 60s serverless limit; per-email calls cannot).
 * Falls back to per-email heuristics on any failure. Bodies are truncated —
 * plenty for triage.
 */
export async function classifyEmailsBatch(
  emails: EmailInput[]
): Promise<{ results: Classification[]; usedAI: boolean }> {
  if (emails.length === 0) return { results: [], usedAI: false };
  if (!willUseRealEmailAI()) {
    return { results: emails.map((e) => classifyHeuristic(e)), usedAI: false };
  }
  try {
    const payload = emails.map((e, i) => ({
      i, from: e.fromName ?? e.fromAddress ?? "", subject: (e.subject ?? "").slice(0, 200),
      body: (e.body ?? "").slice(0, 400),
    }));
    const r = await callClaude<{ results: (Classification & { i: number })[] }>(
      "You are an executive email triage assistant. For EACH email in the input array, classify it. " +
        "Return ONLY minified JSON {results:[{i(matching input index)," +
        "category('urgent'|'needs_reply'|'waiting'|'support'|'sales_lead'|'billing'|'partnership'|'newsletter'|'low_priority'|'personal'|'follow_up')," +
        "priority('critical'|'high'|'medium'|'low'),summary(1 sentence),needsReply(bool)," +
        "isSensitive(bool: legal/financial/security/medical/government/dispute/refund/complaint)," +
        "attentionReason(string or null),suggestedAction(string or null),deadline('YYYY-MM-DD' or null)}]}. " +
        "Every input index must appear exactly once. No commentary.",
      payload,
      Math.min(8000, 300 * emails.length + 500)
    );
    const byIndex = new Map((r.results ?? []).map((x) => [x.i, x]));
    const results = emails.map((e, i) => {
      const got = byIndex.get(i);
      const base = got ?? classifyHeuristic(e);
      base.isSensitive = base.isSensitive || isSensitiveEmail({ subject: e.subject, body: e.body, category: base.category });
      return base as Classification;
    });
    return { results, usedAI: true };
  } catch {
    return { results: emails.map((e) => classifyHeuristic(e)), usedAI: false };
  }
}

export async function draftReply(email: EmailInput, tone: DraftTone): Promise<{ draft: string; usedAI: boolean }> {
  if (!willUseRealEmailAI()) return { draft: draftHeuristic(email, tone), usedAI: false };
  try {
    const r = await callClaude<{ draft: string }>(
      `You write excellent business email replies. Tone: ${tone}. Return ONLY minified JSON {draft:string}. ` +
        "The draft is plain text, ready to send: greeting, 2-4 short paragraphs answering the sender's points, sign-off " +
        "(no signature name — the user adds it). Never invent commitments, prices, or facts the user didn't state; when " +
        "information is missing, politely say you'll follow up with specifics.",
      email, 1500
    );
    if (!r.draft?.trim()) throw new Error("empty draft");
    return { draft: r.draft.trim(), usedAI: true };
  } catch {
    return { draft: draftHeuristic(email, tone), usedAI: false };
  }
}
