/**
 * Browser Studio — AI Website Assistant (server-only).
 * Answers questions about the currently-inspected page and runs preset SEO
 * actions, using the compact page context. Real AI when ANTHROPIC_API_KEY is
 * set; otherwise a deterministic placeholder so the flow always works (and is
 * never billed — consistent with every other generator).
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AssistantAction } from "./types";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

const ACTION_PROMPT: Record<AssistantAction, string> = {
  improve_seo: "Give a prioritized, specific list of SEO improvements for this page.",
  rewrite: "Rewrite the main page content to be clearer, more engaging, and better optimized — keep it truthful to the topic.",
  meta_title: "Write 3 strong, click-worthy meta title options (≤60 chars each).",
  meta_description: "Write 3 compelling meta description options (120–160 chars each).",
  suggest_headings: "Propose a clean H1 + H2/H3 heading outline for this page.",
  internal_links: "Suggest internal links (anchor text + where they'd point) that would strengthen this page.",
  explain_issues: "Explain the page's SEO issues in plain language, why each matters, and how to fix it.",
  readability: "Give concrete edits to improve readability (sentence length, structure, tone).",
  cta: "Suggest stronger call-to-action copy and placement for this page.",
};

export function willUseRealAssistant(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function askWebsiteAssistant(input: {
  context: string;
  action?: AssistantAction;
  question?: string;
}): Promise<{ answer: string; usedAI: boolean }> {
  const task = input.action ? ACTION_PROMPT[input.action] : (input.question || "").trim();
  if (!task) return { answer: "Ask a question about the page, or pick a suggested action.", usedAI: false };

  if (!willUseRealAssistant()) {
    return { answer: placeholder(input.action, task), usedAI: false };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system:
        "You are an expert SEO and web-content assistant inside CreatorsForge Browser Studio. " +
        "You are given a compact summary of the page the user is viewing. Answer practically and concisely, " +
        "with specific, ready-to-use suggestions. Use short markdown (headings, bullets). Do not invent facts about the page beyond the summary.",
      messages: [{ role: "user", content: `PAGE SUMMARY:\n${input.context}\n\nTASK: ${task}` }],
    });
    const answer = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    return { answer: answer || "No suggestion generated — try rephrasing.", usedAI: true };
  } catch {
    return { answer: placeholder(input.action, task), usedAI: false };
  }
}

function placeholder(action: AssistantAction | undefined, task: string): string {
  if (action === "meta_title") return "• Your Primary Keyword — Clear Benefit | Brand\n• How to [Outcome] with [Topic] (2026 Guide)\n• [Topic]: The Complete Beginner's Guide\n\n(Set ANTHROPIC_API_KEY for tailored, page-specific titles.)";
  if (action === "meta_description") return "Discover how [topic] helps you [benefit]. This guide covers [point 1], [point 2], and [point 3] — with practical steps you can use today. Start free.\n\n(Placeholder — real AI writes page-specific descriptions when configured.)";
  if (action === "explain_issues") return "Work through the inspector's Critical items first (missing title/description/H1/viewport), then Warnings (alt text, canonical, structured data, content depth). Each fix directly improves how search engines read and rank the page.\n\n(Set ANTHROPIC_API_KEY for a tailored explanation.)";
  return `Here's the plan for: "${task}". Address the inspector's critical issues first, then warnings, focusing on title, meta description, a single clear H1, alt text, and content depth. \n\n(This is a placeholder — add ANTHROPIC_API_KEY to get specific, AI-written suggestions for this exact page.)`;
}
