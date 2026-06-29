/**
 * Lightweight AI text tools. Uses Claude when ANTHROPIC_API_KEY is set; otherwise
 * a deterministic placeholder so the tools always work (no credits for placeholder).
 * Two output shapes: hashtags (sets), meta-titles (title+desc), and a generic
 * `{items: string[]}` list used by most tools. Add a tool = one entry in TOOLS.
 */
import Anthropic from "@anthropic-ai/sdk";

export type ToolId =
  | "hashtags" | "meta-titles" | "meta-descriptions" | "viral-hooks"
  | "youtube-description" | "product-description"
  | "keyword-planner" | "faq" | "landing-copy" | "newsletter";

export type HashtagOutput = { sets: { label: string; tags: string[] }[] };
export type MetaTitleOutput = { options: { title: string; description: string }[] };
export type ListOutput = { items: string[] };
export type ToolOutput = HashtagOutput | MetaTitleOutput | ListOutput;

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";
const LIST_TOOLS: ToolId[] = ["meta-descriptions", "viral-hooks", "youtube-description", "product-description", "keyword-planner", "faq", "landing-copy", "newsletter"];

const SYSTEM: Record<ToolId, string> = {
  hashtags: "You are a social media strategist. Return ONLY minified JSON {sets:[{label,tags:string[]}]} with 3 sets (Broad, Niche, Long-tail), each 6-10 hashtags including the # prefix. Tailor to the platform if given.",
  "meta-titles": "You are an SEO expert. Return ONLY minified JSON {options:[{title,description}]} with 6 SEO title options (≤60 chars) + meta descriptions (≤155 chars).",
  "meta-descriptions": "You are an SEO copywriter. Return ONLY minified JSON {items:string[]} with 6 compelling meta descriptions (≤155 chars each) for the topic.",
  "viral-hooks": "You are a short-form video expert. Return ONLY minified JSON {items:string[]} with 8 scroll-stopping opening hooks (1 line each) for a video about the topic.",
  "youtube-description": "You are a YouTube growth expert. Return ONLY minified JSON {items:string[]} with 2 full YouTube descriptions — each with a hook line, a short summary, and 3-5 relevant hashtags.",
  "product-description": "You are an ecommerce copywriter. Return ONLY minified JSON {items:string[]} with 4 persuasive product descriptions (mix short + long) highlighting benefits and a CTA.",
  "keyword-planner": "You are an SEO keyword strategist. Return ONLY minified JSON {items:string[]} with 12 keyword ideas for the topic (mix of head + long-tail), each followed by its search intent in parentheses, e.g. 'best dog food (commercial)'.",
  faq: "You are an SEO content strategist. Return ONLY minified JSON {items:string[]} with 8 FAQ entries about the topic, each formatted exactly as 'Q: <question>\\nA: <answer>'.",
  "landing-copy": "You are a conversion copywriter. Return ONLY minified JSON {items:string[]} with landing-page copy blocks for the topic, one per item, labelled: 'Headline: …', 'Subheadline: …', 'Benefit: …' (3 of these), 'CTA: …'.",
  newsletter: "You are an email marketer. Return ONLY minified JSON {items:string[]} with 3 newsletter summaries about the topic, each formatted 'Subject: <line>\\n<2-3 sentence body>'.",
};

function words(topic: string): string[] {
  return topic.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
}

function placeholder(tool: ToolId, topic: string, platform?: string): ToolOutput {
  const t = topic.trim();
  const T = t.replace(/\b\w/g, (c) => c.toUpperCase());
  const w = words(topic);
  const tag = (s: string) => "#" + s.replace(/\s+/g, "");

  switch (tool) {
    case "hashtags":
      return {
        sets: [
          { label: "Broad", tags: [tag(t.replace(/\s+/g, "")), "#viral", "#fyp", "#trending", `#${platform || "social"}`] },
          { label: "Niche", tags: w.slice(0, 4).map(tag).concat(w.slice(0, 3).map((x) => tag(x + "tips"))) },
          { label: "Long-tail", tags: w.slice(0, 3).map((x) => tag("best" + x)).concat([tag(t.replace(/\s+/g, "") + "2026")]) },
        ],
      };
    case "meta-titles":
      return {
        options: [
          { title: `${T}: The Complete ${new Date().getFullYear()} Guide`, description: `Everything you need to know about ${t} — benefits, tips, and mistakes to avoid.` },
          { title: `${T} — Top Tips & Best Practices`, description: `Actionable ${t} tips you can use today, explained simply.` },
          { title: `How to Master ${T} (Step by Step)`, description: `A step-by-step guide to ${t} for beginners and pros.` },
          { title: `The Ultimate ${T} Checklist`, description: `A no-fluff ${t} checklist to get results faster.` },
        ],
      };
    case "meta-descriptions":
      return { items: [
        `Discover everything about ${t}: benefits, tips, and common mistakes to avoid in our complete guide.`,
        `Learn ${t} the easy way. Practical steps, expert tips, and a free checklist inside.`,
        `${T} explained simply — what it is, why it matters, and how to get started today.`,
        `Looking for ${t}? Here's the no-fluff guide with everything you need to know.`,
      ] };
    case "viral-hooks":
      return { items: [
        `Nobody talks about this ${t} secret…`,
        `I tried ${t} for 30 days — here's what happened.`,
        `Stop doing ${t} wrong. Do this instead.`,
        `The truth about ${t} no one tells you.`,
        `${T} in 30 seconds (save this).`,
        `Why your ${t} isn't working.`,
        `3 ${t} mistakes that are costing you.`,
        `Watch this before you try ${t}.`,
      ] };
    case "youtube-description":
      return { items: [
        `In this video we break down ${t} into simple, actionable steps.\n\nWhat you'll learn:\n• What ${t} is\n• Why it matters\n• How to get started\n\n👍 Like & subscribe for more.\n${w.slice(0, 4).map(tag).join(" ")}`,
        `${T} — the complete guide. Everything you need to know, explained clearly.\n\n👉 Subscribe for weekly videos.\n${["#" + t.replace(/\s+/g, ""), "#tutorial", "#howto"].join(" ")}`,
      ] };
    case "product-description":
      return { items: [
        `Meet ${T} — designed to make your life easier. Premium quality, built to last. Order today.`,
        `${T}: the smart choice. Loved by customers for its quality and value. Limited stock — shop now.`,
        `Upgrade your routine with ${T}. Thoughtfully made, beautifully simple, and ready to ship.`,
        `Why settle? ${T} delivers the performance you want at a price you'll love. Add to cart today.`,
      ] };
    case "keyword-planner":
      return { items: [
        `${t} (informational)`, `best ${t} (commercial)`, `${t} guide (informational)`,
        `how to ${t} (informational)`, `${t} tips (informational)`, `${t} for beginners (informational)`,
        `${t} vs alternatives (commercial)`, `buy ${t} (transactional)`, `${t} reviews (commercial)`,
        `cheap ${t} (transactional)`, `${t} near me (transactional)`, `${t} 2026 (informational)`,
      ] };
    case "faq":
      return { items: [
        `Q: What is ${t}?\nA: ${T} is … (placeholder answer).`,
        `Q: Is ${t} worth it?\nA: Yes — here's why … (placeholder answer).`,
        `Q: How do I start with ${t}?\nA: Follow these steps … (placeholder answer).`,
        `Q: How much does ${t} cost?\nA: It depends on … (placeholder answer).`,
        `Q: What are common ${t} mistakes?\nA: The biggest ones are … (placeholder answer).`,
        `Q: How long does ${t} take?\nA: Typically … (placeholder answer).`,
      ] };
    case "landing-copy":
      return { items: [
        `Headline: ${T} made simple`,
        `Subheadline: Everything you need for ${t}, in one place.`,
        `Benefit: Save time with an all-in-one ${t} workflow.`,
        `Benefit: Get professional results without the learning curve.`,
        `Benefit: Scale your ${t} output without extra effort.`,
        `CTA: Get started free →`,
      ] };
    case "newsletter":
      return { items: [
        `Subject: The ${t} update you need\nThis week we break down ${t} — what's new, why it matters, and how to use it. Read on for the highlights.`,
        `Subject: 3 ${t} tips for this week\nQuick wins you can apply today, plus a resource we think you'll love.`,
        `Subject: Don't miss this on ${t}\nA short guide to getting more from ${t}, straight to your inbox.`,
      ] };
  }
}

export function willUseRealToolAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function isToolId(s: string): s is ToolId {
  return s in SYSTEM;
}

export async function toolGenerate(
  tool: ToolId,
  input: { topic: string; platform?: string }
): Promise<{ output: ToolOutput; usedAI: boolean }> {
  if (!willUseRealToolAI()) return { output: placeholder(tool, input.topic, input.platform), usedAI: false };
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM[tool],
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

export { LIST_TOOLS };
