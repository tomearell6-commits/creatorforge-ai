/**
 * Local Business profile audit engine (SERVER-ONLY). Scores a business location
 * across five categories and produces checks, issues, and an AI narrative
 * (summary + 7-day / 30-day plans). Deterministic scores; AI for narrative.
 *
 * This is a PROFILE HEALTH / LOCAL VISIBILITY READINESS score — never a
 * guaranteed Google ranking.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { LB_COMPLETENESS_CHECKS, LB_AUDIT_CATEGORIES, type LbAuditCategory } from "@/config/localBusiness";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export type AuditLocation = {
  business_name: string; address: string | null; phone: string | null; website: string | null;
  primary_category: string | null; additional_categories_json?: unknown[]; description: string | null;
  hours_json?: Record<string, unknown>; special_hours_json?: Record<string, unknown>;
  attributes_json?: Record<string, unknown>; appointment_url: string | null;
  products_json?: unknown[]; services_json?: unknown[];
};
export type AuditCounts = { posts: number; reviews: number; answeredReviews: number };

export type AuditCheck = { category: LbAuditCategory; check_key: string; label: string; passed: boolean; severity: "info" | "warning" | "critical"; detail?: string };
export type AuditIssue = { severity: "warning" | "critical"; title: string; detail: string; recommendation: string };
export type AuditScores = Record<"overall" | LbAuditCategory, number>;

function has(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

/** Run the deterministic audit. */
export function runLocationAudit(loc: AuditLocation, counts: AuditCounts): { scores: AuditScores; checks: AuditCheck[]; issues: AuditIssue[] } {
  const checks: AuditCheck[] = [];
  const issues: AuditIssue[] = [];

  // --- Completeness (field presence) ---
  const fieldVal: Record<string, unknown> = {
    business_name: loc.business_name, primary_category: loc.primary_category,
    additional_categories: loc.additional_categories_json, description: loc.description,
    address: loc.address, phone: loc.phone, website: loc.website, hours: loc.hours_json,
    special_hours: loc.special_hours_json, appointment_url: loc.appointment_url,
    products: loc.products_json, services: loc.services_json, attributes: loc.attributes_json,
  };
  let compPass = 0;
  for (const c of LB_COMPLETENESS_CHECKS) {
    const passed = has(fieldVal[c.key]);
    if (passed) compPass++;
    checks.push({ category: "completeness", check_key: c.key, label: c.label, passed, severity: passed ? "info" : c.severity });
    if (!passed && c.severity === "critical") issues.push({ severity: "critical", title: `Missing ${c.label.toLowerCase()}`, detail: `${c.label} is not set on this profile.`, recommendation: `Add your ${c.label.toLowerCase()} — it's essential for a complete profile.` });
    else if (!passed) issues.push({ severity: "warning", title: `Add ${c.label.toLowerCase()}`, detail: `${c.label} is missing.`, recommendation: `Adding ${c.label.toLowerCase()} improves profile completeness.` });
  }
  const completeness = Math.round((compPass / LB_COMPLETENESS_CHECKS.length) * 100);

  // --- Content activity (posting) ---
  const contentChecks: [string, string, boolean][] = [
    ["recent_posts", "Recent post activity", counts.posts > 0],
    ["posting_consistency", "Posting consistency", counts.posts >= 4],
    ["content_variety", "Content variety", counts.posts >= 2],
  ];
  contentChecks.forEach(([k, l, p]) => checks.push({ category: "content", check_key: k, label: l, passed: p, severity: p ? "info" : "warning" }));
  const content = Math.round((contentChecks.filter((c) => c[2]).length / contentChecks.length) * 100);
  if (counts.posts === 0) issues.push({ severity: "warning", title: "No recent posts", detail: "This profile has no posts prepared or published.", recommendation: "Create a business update to keep your profile active." });

  // --- Brand quality ---
  const descLen = (loc.description ?? "").trim().length;
  const brandChecks: [string, string, boolean][] = [
    ["description_quality", "Business description quality", descLen >= 120],
    ["website_consistency", "Website present", has(loc.website)],
    ["contact_consistency", "Contact details present", has(loc.phone)],
  ];
  brandChecks.forEach(([k, l, p]) => checks.push({ category: "brand", check_key: k, label: l, passed: p, severity: p ? "info" : "warning" }));
  const brand = Math.round((brandChecks.filter((c) => c[2]).length / brandChecks.length) * 100);
  if (descLen > 0 && descLen < 120) issues.push({ severity: "warning", title: "Description is thin", detail: `Your description is ${descLen} characters.`, recommendation: "Aim for a richer 150+ character description covering what you offer and where." });

  // --- Local SEO readiness ---
  const seoChecks: [string, string, boolean][] = [
    ["category_relevance", "Primary category set", has(loc.primary_category)],
    ["description_clarity", "Description describes services", descLen >= 80],
    ["services_completeness", "Services listed", has(loc.services_json)],
    ["website_alignment", "Website linked", has(loc.website)],
  ];
  seoChecks.forEach(([k, l, p]) => checks.push({ category: "seo", check_key: k, label: l, passed: p, severity: p ? "info" : "warning" }));
  const seo = Math.round((seoChecks.filter((c) => c[2]).length / seoChecks.length) * 100);

  // --- Customer engagement ---
  const answerRate = counts.reviews > 0 ? counts.answeredReviews / counts.reviews : 0;
  const engChecks: [string, string, boolean][] = [
    ["review_activity", "Has reviews", counts.reviews > 0],
    ["review_responses", "Reviews answered", answerRate >= 0.5],
  ];
  engChecks.forEach(([k, l, p]) => checks.push({ category: "engagement", check_key: k, label: l, passed: p, severity: p ? "info" : "warning" }));
  const engagement = counts.reviews === 0 ? 50 : Math.round((engChecks.filter((c) => c[2]).length / engChecks.length) * 100);

  // --- Weighted overall ---
  const byCat: Record<LbAuditCategory, number> = { completeness, content, brand, seo, engagement };
  const overall = Math.round(LB_AUDIT_CATEGORIES.reduce((a, c) => a + byCat[c.id] * c.weight, 0));

  return { scores: { overall, completeness, content, brand, seo, engagement }, checks, issues };
}

/** AI narrative: executive summary + 7-day + 30-day plans + content ideas. */
export async function generateAuditNarrative(loc: AuditLocation, scores: AuditScores, issues: AuditIssue[]): Promise<{ summary: string; sevenDay: string[]; thirtyDay: string[]; contentIdeas: string[] }> {
  const fallback = {
    summary: `Profile Health Score ${scores.overall}/100. Focus on the ${issues.filter((i) => i.severity === "critical").length} critical item(s) first.`,
    sevenDay: issues.slice(0, 5).map((i) => i.recommendation),
    thirtyDay: ["Post weekly business updates", "Add products and services", "Collect and respond to reviews", "Complete every profile field"],
    contentIdeas: ["Introduce your team", "Highlight a popular product or service", "Share a seasonal offer", "Answer a common customer question"],
  };
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 700,
      system: "You are a local marketing consultant. Given a Google Business Profile audit, return ONLY JSON {\"summary\":\"…\",\"sevenDay\":[\"…\"],\"thirtyDay\":[\"…\"],\"contentIdeas\":[\"…\"]}. Practical, honest, never promise rankings.",
      messages: [{ role: "user", content: `Business: ${loc.business_name} (${loc.primary_category ?? "uncategorized"})\nScores: ${JSON.stringify(scores)}\nTop issues: ${issues.slice(0, 6).map((i) => i.title).join("; ")}` }],
    });
    const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const p = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return {
      summary: String(p.summary || fallback.summary),
      sevenDay: Array.isArray(p.sevenDay) ? p.sevenDay.map(String).slice(0, 7) : fallback.sevenDay,
      thirtyDay: Array.isArray(p.thirtyDay) ? p.thirtyDay.map(String).slice(0, 8) : fallback.thirtyDay,
      contentIdeas: Array.isArray(p.contentIdeas) ? p.contentIdeas.map(String).slice(0, 8) : fallback.contentIdeas,
    };
  } catch { return fallback; }
}
