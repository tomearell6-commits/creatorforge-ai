/**
 * aiRecommendationEngine — turns scan + scores + issues into an executive
 * summary, prioritized recommendations, recommended content, and a fix plan.
 * Uses Claude when ANTHROPIC_API_KEY is set; otherwise a deterministic
 * placeholder built from the detected issues (so the tool always works).
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ScanResult, Scores, AuditIssue, Recommendation, FixPlan } from "./types";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";
export function willUseRealSeoAI(): boolean { return !!process.env.ANTHROPIC_API_KEY; }

type Analysis = { executiveSummary: string; recommendations: Recommendation[]; recommendedContent: { type: string; title: string; reason: string }[] };

function compact(scan: ScanResult, scores: Scores, issues: AuditIssue[]) {
  return JSON.stringify({
    url: scan.finalUrl, scores,
    critical: issues.filter((i) => i.severity === "critical").map((i) => i.title),
    warnings: issues.filter((i) => i.severity === "warning").map((i) => i.title),
    title: scan.title, metaDescription: scan.metaDescription, h1: scan.h1,
    words: scan.wordCount, images: scan.imageCount, missingAlt: scan.imagesMissingAlt,
    schema: scan.schemaTypes, sitemap: scan.sitemap.found, robots: scan.robotsTxt.found,
  });
}

async function claudeJSON<T>(system: string, user: string, fallback: T): Promise<{ data: T; usedAI: boolean }> {
  if (!willUseRealSeoAI()) return { data: fallback, usedAI: false };
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({ model: MODEL, max_tokens: 2500, system, messages: [{ role: "user", content: user }] });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim().replace(/^```json?/i, "").replace(/```$/, "");
    return { data: JSON.parse(text) as T, usedAI: true };
  } catch { return { data: fallback, usedAI: false }; }
}

export async function generateAnalysis(scan: ScanResult, scores: Scores, issues: AuditIssue[], auditType: string): Promise<Analysis & { usedAI: boolean }> {
  const fallback: Analysis = {
    executiveSummary: `Overall SEO score ${scores.overall}/100. ${issues.filter((i) => i.severity === "critical").length} critical issue(s) and ${issues.filter((i) => i.severity === "warning").length} warning(s) were found. Address the critical items first (HTTPS, indexing, titles), then improve content depth, internal linking, and performance to raise ranking potential.`,
    recommendations: issues.filter((i) => i.severity !== "passed").slice(0, 10).map((i, idx) => ({ category: i.issue_type, title: i.title, detail: i.recommended_fix, priority: i.severity === "critical" ? 1 : 2 + idx })),
    recommendedContent: [
      { type: "Blog post", title: `A pillar article for ${scan.finalUrl.replace(/^https?:\/\//, "").split("/")[0]}`, reason: "Target missing keywords and build topical authority." },
      { type: "FAQ", title: "FAQ section answering common buyer questions", reason: "Captures long-tail queries and enables FAQ schema." },
      { type: "Supporting article", title: "How-to guide linking to your main page", reason: "Strengthens internal linking and relevance." },
    ],
  };
  const system = `You are a senior SEO consultant. Analyze the audit JSON and return ONLY minified JSON {executiveSummary:string, recommendations:[{category,title,detail,priority}], recommendedContent:[{type,title,reason}]}. Audit type: ${auditType}. Be specific, prioritized (priority 1=highest), and actionable. 8-12 recommendations.`;
  return claudeJSON(system, compact(scan, scores, issues), fallback).then((r) => ({ ...r.data, usedAI: r.usedAI }));
}

export async function generateFixPlan(scan: ScanResult, scores: Scores, issues: AuditIssue[], auditType: string): Promise<FixPlan> {
  const crit = issues.filter((i) => i.severity === "critical");
  const warn = issues.filter((i) => i.severity === "warning");
  const fallback: FixPlan = {
    priorityFixes: [...crit, ...warn].slice(0, 8).map((i, idx) => ({ title: i.title, steps: [i.recommended_fix], priority: i.severity === "critical" ? 1 : 2 + idx })),
    wordpressPlugins: ["Rank Math SEO", "WP Rocket (caching)", "Smush (image optimization)", "Redirection (broken links)"],
    contentRecommendations: ["Expand thin pages to 600+ words", "Add an FAQ section with schema", "Create supporting articles around your main topic"],
    internalLinkingPlan: ["Link new articles to your main service/product page", "Add contextual links between related posts", "Use descriptive anchor text with keywords"],
    blogTopicIdeas: ["Beginner's guide to your niche", "Common mistakes and how to avoid them", "Comparison / 'best of' roundup", "FAQ-style answer post"],
    metaTitleRewrites: scan.title ? [`${scan.title.slice(0, 50)} | Brand`] : ["Add a 50–60 char title with your primary keyword"],
    metaDescriptionRewrites: ["Write a 150-char description with the keyword and a clear benefit + CTA."],
    headingImprovements: scan.h1.length !== 1 ? ["Use exactly one H1 with the primary keyword", "Add H2/H3 subheadings per section"] : ["Add H2/H3 subheadings to structure content"],
    imageAltSuggestions: scan.imagesMissingAlt > 0 ? ["Add descriptive, keyword-aware alt text to all images"] : ["Alt text looks good — keep it descriptive"],
    usedAI: false,
  };
  const system = `You are a senior SEO consultant. From the audit JSON produce ONLY minified JSON matching this shape: {priorityFixes:[{title,steps:string[],priority}],wordpressPlugins:string[],contentRecommendations:string[],internalLinkingPlan:string[],blogTopicIdeas:string[],metaTitleRewrites:string[],metaDescriptionRewrites:string[],headingImprovements:string[],imageAltSuggestions:string[]}. Audit type: ${auditType}. Be concrete and step-by-step.`;
  const r = await claudeJSON<Omit<FixPlan, "usedAI">>(system, compact(scan, scores, issues), fallback);
  return { ...r.data, usedAI: r.usedAI };
}
