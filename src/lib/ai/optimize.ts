/**
 * AI Content Optimizer (Phase 6 — Module 4). Generates publishing metadata
 * (SEO title, description, hashtags, keywords, tags, CTA, per-platform captions)
 * from a video's title/topic. Uses Claude when ANTHROPIC_API_KEY is set,
 * otherwise a deterministic placeholder so the flow always works.
 */
import Anthropic from "@anthropic-ai/sdk";

export type OptimizeInput = {
  title: string;
  category?: string;
  script?: string;
};

export type OptimizeResult = {
  seoTitle: string;
  description: string;
  hashtags: string[];
  keywords: string[];
  tags: string[];
  cta: string;
  captions: { platform: string; text: string }[];
};

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

function keywordsFrom(title: string, category?: string): string[] {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const extra = (category ?? "").toLowerCase().split(/[\s-]+/).filter(Boolean);
  return Array.from(new Set([...base, ...extra])).slice(0, 10);
}

function placeholder(input: OptimizeInput): OptimizeResult {
  const kw = keywordsFrom(input.title, input.category);
  const hashtags = kw.slice(0, 6).map((k) => `#${k.replace(/\s+/g, "")}`);
  const cat = input.category ? input.category.replace(/-/g, " ") : "content";
  return {
    seoTitle: `${input.title} — ${cat[0]?.toUpperCase()}${cat.slice(1)} You Can't Miss`,
    description:
      `${input.title}\n\nIn this video we break down ${cat} into clear, actionable beats. ` +
      `Watch to the end for the key takeaway, and let us know your thoughts in the comments.`,
    hashtags,
    keywords: kw,
    tags: kw.slice(0, 8),
    cta: "👉 Like, subscribe, and follow for more — new videos every week!",
    captions: [
      { platform: "youtube", text: `${input.title} 🎬 Full breakdown inside. ${hashtags.slice(0, 3).join(" ")}` },
      { platform: "tiktok", text: `${input.title} 👀 wait for the end #fyp ${hashtags.slice(0, 2).join(" ")}` },
      { platform: "instagram", text: `${input.title} ✨ Save this for later! ${hashtags.join(" ")}` },
      { platform: "x", text: `${input.title} — a thread-worthy watch. ${hashtags.slice(0, 2).join(" ")}` },
    ],
  };
}

export function willUseRealOptimizer(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function optimize(input: OptimizeInput): Promise<{ result: OptimizeResult; usedAI: boolean }> {
  if (!willUseRealOptimizer()) return { result: placeholder(input), usedAI: false };

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system:
        "You are a social media optimization expert. Return ONLY valid minified JSON with keys: " +
        "seoTitle, description, hashtags (array), keywords (array), tags (array), cta, " +
        "captions (array of {platform, text}). Platforms: youtube, tiktok, instagram, x.",
      messages: [
        {
          role: "user",
          content: `Video title: "${input.title}"\nCategory: ${input.category ?? "general"}\n${
            input.script ? `Script excerpt: ${input.script.slice(0, 800)}` : ""
          }`,
        },
      ],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```json?/i, "")
      .replace(/```$/, "");
    const parsed = JSON.parse(text) as OptimizeResult;
    return { result: parsed, usedAI: true };
  } catch {
    return { result: placeholder(input), usedAI: false };
  }
}
