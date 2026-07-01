/**
 * Prompt templates for AI script generation.
 *
 * `buildScriptPrompt` produces the system + user messages sent to Claude.
 * `buildMockScript` produces the offline placeholder (used when no API key is
 * configured, or when AI_FORCE_MOCK=true). Both share the same category map so
 * the output structure stays consistent between real and placeholder modes.
 */

import { CATEGORIES, LENGTHS, TONES, DEFAULT_TONE, DEFAULT_LENGTH } from "@/lib/constants";

/** Per-category writing guidance injected into the system prompt. */
const CATEGORY_GUIDANCE: Record<string, string> = {
  "horror-stories":
    "Write tense, atmospheric horror narration. Build dread with sensory detail and a chilling final twist.",
  motivational:
    "Write high-energy, punchy motivation. Use short declarative lines, a rising arc, and a powerful closing call to action.",
  "anime-stories":
    "Write an anime-styled narrative with vivid characters, emotional stakes, and a dramatic turning point.",
  "business-marketing":
    "Write persuasive brand storytelling. Lead with the customer's problem, present the solution, and end with a clear benefit.",
  "product-ads":
    "Write a short, punchy ad. Hook fast, highlight one core benefit, handle one objection, and end with a strong CTA.",
  educational:
    "Write a clear, structured explainer. Open with why it matters, teach one idea at a time, and summarize the takeaway.",
  "kids-stories":
    "Write a friendly, age-appropriate story with simple language, a gentle lesson, and a warm ending. Avoid anything scary.",
  "ai-news":
    "Write a crisp news-style brief. Lead with the headline development, give context, and note why it matters.",
  finance:
    "Write an informative finance script. Be concrete and practical, avoid hype, and include a brief risk disclaimer.",
  "relationship-stories":
    "Write an emotionally resonant relationship narrative with relatable moments and a reflective conclusion.",
  "podcast-scripts":
    "Write a conversational podcast segment with a natural hook, talking points, and a smooth sign-off.",
  "blog-posts":
    "Write an SEO-friendly blog post with a compelling intro, scannable sections with headers, and a conclusion.",
  "social-captions":
    "Write a scroll-stopping caption: a strong hook line, 2–3 value lines, relevant hashtags, and a CTA.",
};

export type ScriptPromptInput = {
  category: string;
  idea: string;
  title?: string;
  tone?: string;
  length?: string;
};

function resolveLength(length?: string) {
  return LENGTHS.find((l) => l.value === length) ?? LENGTHS.find((l) => l.value === DEFAULT_LENGTH)!;
}

function resolveToneLabel(tone?: string) {
  return (TONES.find((t) => t.value === tone) ?? TONES.find((t) => t.value === DEFAULT_TONE)!).label;
}

/** Build the system + user prompt and the output token cap for a real generation. */
export function buildScriptPrompt({ category, idea, title, tone, length }: ScriptPromptInput) {
  const cat = CATEGORIES.find((c) => c.slug === category);
  const guidance = CATEGORY_GUIDANCE[category] ?? "Write a clear, engaging short-form video script.";
  const len = resolveLength(length);
  const toneLabel = resolveToneLabel(tone);

  const system = [
    "You are CreatorsForge AI, an expert scriptwriter for faceless short-form video content.",
    `Content category: ${cat?.name ?? category}.`,
    guidance,
    `Tone: ${toneLabel}. Target length: roughly ${len.words} words.`,
    "Structure the script with clear labeled beats (e.g. [HOOK], [INTRO], [SCENE 1], [SCENE 2], [CALL TO ACTION]).",
    "Output ONLY the finished script. Do not include any preamble, explanation, or commentary before or after it.",
  ].join("\n");

  const user = [
    title ? `Title: ${title}` : null,
    `Idea: ${idea}`,
    "Write the script now.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user, maxTokens: len.maxTokens };
}

/** Deterministic offline placeholder — no API call, no credits charged. */
export function buildMockScript({ category, idea, title, tone, length }: ScriptPromptInput) {
  const cat = CATEGORIES.find((c) => c.slug === category);
  const label = cat ? cat.name : "Content";
  const heading = title?.trim() || idea.slice(0, 60);
  const len = resolveLength(length);
  const toneLabel = resolveToneLabel(tone);

  const content = `# ${heading}
Category: ${label} ${cat?.emoji ?? ""} · Tone: ${toneLabel} · Length: ${len.label}

[HOOK]
${idea.trim()} — but what most people miss is the one detail that changes everything.

[INTRO]
Welcome back. In the next ${len.label.includes("30") ? "30 seconds" : "minute"} we'll break
"${idea.trim()}" down into beats you can actually use.

[SCENE 1]
Set the stage. Establish who, what, and why it matters right now.

[SCENE 2]
Raise the stakes. Introduce tension, a twist, or the core insight.

[SCENE 3]
Pay it off. Deliver the resolution or the actionable takeaway.

[CALL TO ACTION]
If this helped, follow for more ${label} content. Drop a comment with your take.

---
(Generated by the CreatorsForge AI placeholder engine — set ANTHROPIC_API_KEY to enable
real AI generation. No credits were charged.)`;

  return { content, tokensUsed: 0 };
}
