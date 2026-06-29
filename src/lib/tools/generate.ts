/**
 * Lightweight AI text tools (Hashtag Generator, Meta Title Generator, …).
 * Uses Claude when ANTHROPIC_API_KEY is set; otherwise a deterministic
 * placeholder so the tools always work (no credits charged for placeholder).
 * Adding a tool = add a case in the prompt + placeholder switches.
 */
import Anthropic from "@anthropic-ai/sdk";

export type ToolId = "hashtags" | "meta-titles";

export type HashtagOutput = { sets: { label: string; tags: string[] }[] };
export type MetaTitleOutput = { options: { title: string; description: string }[] };
export type ToolOutput = HashtagOutput | MetaTitleOutput;

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

function words(topic: string): string[] {
  return topic.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
}

function placeholder(tool: ToolId, topic: string, platform?: string): ToolOutput {
  const w = words(topic);
  const tag = (s: string) => "#" + s.replace(/\s+/g, "");
  if (tool === "hashtags") {
    const base = w.slice(0, 4);
    return {
      sets: [
        { label: "Broad", tags: [tag(topic.replace(/\s+/g, "")), "#viral", "#fyp", "#trending", `#${platform || "social"}`] },
        { label: "Niche", tags: base.map(tag).concat(base.map((x) => tag(x + "tips"))) },
        { label: "Long-tail", tags: base.map((x) => tag("best" + x)).concat([tag(topic.replace(/\s+/g, "") + "2026")]) },
      ],
    };
  }
  // meta-titles
  const t = topic.trim();
  const T = t.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    options: [
      { title: `${T}: The Complete ${new Date().getFullYear()} Guide`, description: `Everything you need to know about ${t} — benefits, tips, and common mistakes.` },
      { title: `${T} — Top Tips & Best Practices`, description: `Actionable ${t} tips you can use today, explained simply.` },
      { title: `How to Master ${T} (Step by Step)`, description: `A step-by-step guide to ${t} for beginners and pros alike.` },
      { title: `${T}: What Most People Get Wrong`, description: `Avoid the common ${t} mistakes with this practical breakdown.` },
      { title: `The Ultimate ${T} Checklist`, description: `A no-fluff ${t} checklist to get results faster.` },
    ],
  };
}

export function willUseRealToolAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function toolGenerate(
  tool: ToolId,
  input: { topic: string; platform?: string }
): Promise<{ output: ToolOutput; usedAI: boolean }> {
  if (!willUseRealToolAI()) return { output: placeholder(tool, input.topic, input.platform), usedAI: false };
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const system =
      tool === "hashtags"
        ? "You are a social media strategist. Return ONLY minified JSON: {sets:[{label,tags:string[]}]} with 3 sets (Broad, Niche, Long-tail), each 6-10 hashtags (include the # prefix). Tailor to the platform if given."
        : "You are an SEO expert. Return ONLY minified JSON: {options:[{title,description}]} with 6 SEO title options (≤60 chars) + matching meta descriptions (≤155 chars) for the topic.";
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: `Topic: ${input.topic}${input.platform ? `\nPlatform: ${input.platform}` : ""}` }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```json?/i, "")
      .replace(/```$/, "");
    return { output: JSON.parse(text) as ToolOutput, usedAI: true };
  } catch {
    return { output: placeholder(tool, input.topic, input.platform), usedAI: false };
  }
}
