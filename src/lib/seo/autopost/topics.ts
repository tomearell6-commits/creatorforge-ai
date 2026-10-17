/**
 * SEO Auto-Poster topic planning.
 *
 * Plans a batch of article topics for a site's niche and keeps them from
 * repeating what the site already published. The planner is niche-aware: for
 * health/medical sites it targets medical and educational-research keywords
 * (conditions, mechanisms, prevention, evidence, safety); for every other niche it
 * targets that niche's own educational keywords — forcing medical keywords onto a
 * non-medical site would hurt relevance, so a health angle is only added where it
 * genuinely fits (e.g. pet health for a pet store).
 */
import Anthropic from "@anthropic-ai/sdk";
import { isHealthTopic } from "@/lib/seo/health";

export type Topic = {
  keyword: string;            // focus keyword
  title: string;              // working title / angle
  secondaryKeywords: string[];
  intent: string;             // Informational | Commercial | ...
};

const STOP = new Set(["the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "with", "is", "are", "what", "how", "why", "your", "you", "guide", "complete"]);

function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
  );
}

/** Jaccard similarity of two titles/keywords on their meaningful words (0–1). */
export function similarity(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Drop candidates that repeat an existing title or each other (similarity ≥ threshold). */
export function filterNewTopics(candidates: Topic[], existingTitles: string[], threshold = 0.6): Topic[] {
  const kept: Topic[] = [];
  const seen = [...existingTitles];
  for (const c of candidates) {
    if (!c?.keyword?.trim()) continue;
    const label = `${c.keyword} ${c.title ?? ""}`;
    const clash = seen.some((e) => similarity(label, e) >= threshold || similarity(c.keyword, e) >= threshold);
    if (clash) continue;
    kept.push({ ...c, secondaryKeywords: Array.isArray(c.secondaryKeywords) ? c.secondaryKeywords.slice(0, 12) : [] });
    seen.push(label);
  }
  return kept;
}

function parseJson<T>(text: string): T {
  const t = text.trim().replace(/^```json?/i, "").replace(/```$/, "").trim();
  const first = t.search(/[[{]/);
  const lastBrace = Math.max(t.lastIndexOf("]"), t.lastIndexOf("}"));
  return JSON.parse(first >= 0 && lastBrace > first ? t.slice(first, lastBrace + 1) : t) as T;
}

export async function planTopics(opts: {
  niche: string;
  existingTitles: string[];
  count?: number;
  /** Optional research summary (own site + competitors) to ground the plan. */
  research?: unknown;
}): Promise<Topic[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set.");
  const count = Math.min(20, Math.max(3, opts.count ?? 12));
  const health = isHealthTopic(opts.niche);
  const model = process.env.SEO_AUTOPOST_MODEL || "claude-sonnet-5-5";
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system =
    "You are an SEO content strategist. Return ONLY valid minified JSON: an array of objects " +
    "{keyword:string,title:string,secondaryKeywords:string[],intent:string}. " +
    `Plan ${count} distinct article topics for the site described by the user. Each keyword must be a real phrase people search, ` +
    "with global (worldwide) demand — avoid country-specific terms unless the niche requires them. " +
    "Mix evergreen explainers, how-it-works, comparisons, common questions, and in-depth guides; every topic must support a 1,500+ word article. " +
    (health
      ? "This is a HEALTH / MEDICAL niche: prioritise medical and educational-research keywords — conditions, causes and risk factors, how the body works, prevention, what the research shows, safety and when to see a doctor. Informational intent only; never plan articles that promise cures, give personal treatment or dosing advice, or sell/promote specific drugs. "
      : "Target the niche's own educational keywords. Only add a health angle where it genuinely fits the niche. ") +
    "Do not repeat or closely rephrase any title listed in existingTitles. No duplicate topics in your list.";

  const msg = await client.messages.create({
    model,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: JSON.stringify({ niche: opts.niche, existingTitles: opts.existingTitles.slice(0, 150), research: opts.research ?? null }) }],
  });
  const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
  const raw = parseJson<Topic[]>(text);
  if (!Array.isArray(raw)) throw new Error("Topic planner returned an unexpected format.");
  return filterNewTopics(raw, opts.existingTitles);
}
