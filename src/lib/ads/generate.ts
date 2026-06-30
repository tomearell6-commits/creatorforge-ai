/**
 * AI Advertising copy generator. Produces a full ad-copy pack from a product/
 * offer + objective. Uses Claude when ANTHROPIC_API_KEY is set; otherwise a
 * deterministic placeholder so the studio always works (no credits for placeholder).
 */
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export type AdCopyPack = {
  headlines: string[];
  primaryTexts: string[];
  descriptions: string[];
  ctas: string[];
  hooks: string[];
  benefits: string[];
  hashtags: string[];
  imagePrompts: string[];
  videoPrompts: string[];
  variations: { label: string; headline: string; primaryText: string; cta: string }[];
};

export type AdCopyInput = { product: string; objective?: string; platform?: string; audience?: string };

export function willUseRealAdAI(): boolean { return !!process.env.ANTHROPIC_API_KEY; }

const SYSTEM = `You are a senior performance-marketing copywriter. Return ONLY minified JSON matching:
{"headlines":string[],"primaryTexts":string[],"descriptions":string[],"ctas":string[],"hooks":string[],"benefits":string[],"hashtags":string[],"imagePrompts":string[],"videoPrompts":string[],"variations":[{"label":string,"headline":string,"primaryText":string,"cta":string}]}
Rules: 5 headlines (<=40 chars), 3 primaryTexts (<=125 chars), 3 descriptions, 5 CTAs, 5 scroll-stopping hooks, 5 benefit bullets, 8 hashtags (with #), 3 image prompts, 2 video prompts, and 3 A/B variations (labels A/B/C). Tailor tone to the platform + objective. No emojis in headlines.`;

export async function generateAdCopy(input: AdCopyInput): Promise<{ pack: AdCopyPack; usedAI: boolean }> {
  if (!willUseRealAdAI()) return { pack: placeholder(input), usedAI: false };
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 2500, system: SYSTEM,
      messages: [{ role: "user", content: `Product/offer: ${input.product}\nObjective: ${input.objective ?? "traffic"}\nPlatform: ${input.platform ?? "facebook"}\nAudience: ${input.audience ?? "general"}` }],
    });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim().replace(/^```json?/i, "").replace(/```$/, "");
    return { pack: JSON.parse(text) as AdCopyPack, usedAI: true };
  } catch {
    return { pack: placeholder(input), usedAI: false };
  }
}

function placeholder(input: AdCopyInput): AdCopyPack {
  const p = input.product.trim() || "your product";
  const P = p.replace(/\b\w/g, (c) => c.toUpperCase());
  const w = p.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((x) => x.length > 2);
  const tag = (s: string) => "#" + s.replace(/\s+/g, "");
  return {
    headlines: [`Meet ${P}`, `${P}, Made Simple`, `Try ${P} Today`, `The Smarter ${P}`, `${P} You'll Love`],
    primaryTexts: [
      `Discover ${p} — built to make your day easier. Join thousands who already switched.`,
      `Tired of the old way? ${P} gives you better results in less time. See why people love it.`,
      `${P} is here. Premium quality, fair price, and results you can feel. Get started today.`,
    ],
    descriptions: [`Everything you need from ${p}, in one place.`, `Loved for quality and value.`, `Limited-time offer — don't miss out.`],
    ctas: ["Shop Now", "Learn More", "Get Started", "Sign Up", "Try Free"],
    hooks: [`Stop scrolling — ${p} changes everything.`, `Nobody tells you this about ${p}…`, `I tried ${p} so you don't have to.`, `${P} in 15 seconds.`, `Why everyone's switching to ${p}.`],
    benefits: [`Saves you time`, `Premium quality`, `Easy to start`, `Trusted by thousands`, `Great value`],
    hashtags: w.slice(0, 4).map(tag).concat(["#ad", "#deal", "#trending", "#new"]).slice(0, 8),
    imagePrompts: [`Clean studio product shot of ${p}, soft lighting, lifestyle background`, `${P} in real use, candid, bright natural light`, `Bold flat-lay of ${p} with brand colors`],
    videoPrompts: [`15s UGC-style clip showing ${p} solving a problem, upbeat`, `Fast-paced ${p} feature montage with captions`],
    variations: [
      { label: "A", headline: `Meet ${P}`, primaryText: `The easier way to get results with ${p}.`, cta: "Shop Now" },
      { label: "B", headline: `${P} You'll Love`, primaryText: `Join thousands who switched to ${p}.`, cta: "Learn More" },
      { label: "C", headline: `Try ${P} Today`, primaryText: `Limited-time offer on ${p} — start now.`, cta: "Get Started" },
    ],
  };
}
