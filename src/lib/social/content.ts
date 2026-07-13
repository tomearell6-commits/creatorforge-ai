/**
 * Social content generation (SERVER-ONLY). One campaign idea → platform-specific
 * variations (NOT identical copy). Claude when configured; deterministic fallback.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/config/socialProviderCapabilities";
import { socialContentTypeLabel, type SocialContentType } from "@/config/socialContentCapabilities";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export type ContentInput = {
  business?: string; product?: string; goal?: string; audience?: string; country?: string;
  language?: string; tone?: string; offer?: string; cta?: string; contentType: SocialContentType;
};
export type Variation = {
  platform: SocialProviderId; headline: string; caption: string; body: string; cta: string;
  hashtags: string[]; imagePrompt: string; videoPrompt: string; format: string;
  suggestedTime: string; accessibilityText: string; complianceNotes: string;
};

function fallback(platform: SocialProviderId, input: ContentInput): Variation {
  const name = SOCIAL_PROVIDERS[platform]?.name ?? platform;
  const topic = input.product || input.business || "our update";
  return {
    platform, headline: `${socialContentTypeLabel(input.contentType)}: ${topic}`,
    caption: `${topic}${input.offer ? ` — ${input.offer}` : ""}. ${input.cta || "Learn more"}.`,
    body: `${topic}. ${input.audience ? `For ${input.audience}. ` : ""}${input.cta || "Learn more"}.`,
    cta: input.cta || "Learn more", hashtags: [], imagePrompt: `Clean, original ${name} graphic for ${topic}, on-brand, no text overlay`,
    videoPrompt: `Short ${name} video concept for ${topic}`, format: platform === "youtube" ? "long-form" : "feed",
    suggestedTime: "Weekday mid-morning", accessibilityText: `Image about ${topic}`, complianceNotes: "",
  };
}

export async function generateSocialVariations(input: ContentInput, platforms: SocialProviderId[]): Promise<Variation[]> {
  if (!process.env.ANTHROPIC_API_KEY) return platforms.map((p) => fallback(p, input));
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 1600,
      system: `You are a social media copywriter. For EACH platform produce DISTINCT copy tuned to that platform's norms (length, tone, hashtags, format) — never identical text. Return ONLY JSON: {"variations":[{"platform":"…","headline":"…","caption":"…","body":"…","cta":"…","hashtags":["…"],"imagePrompt":"…","videoPrompt":"…","format":"…","suggestedTime":"…","accessibilityText":"…","complianceNotes":"…"}]}. complianceNotes only if a disclaimer is warranted (health/legal/financial), else empty.`,
      messages: [{ role: "user", content: `Content type: ${socialContentTypeLabel(input.contentType)}\nBusiness: ${input.business ?? ""}\nProduct/service: ${input.product ?? ""}\nGoal: ${input.goal ?? ""}\nAudience: ${input.audience ?? "customers"}\nCountry: ${input.country ?? ""}\nLanguage: ${input.language ?? "English"}\nTone: ${input.tone ?? "professional"}\nOffer: ${input.offer ?? ""}\nCTA: ${input.cta ?? "(suggest)"}\nPlatforms: ${platforms.join(", ")}` }],
    });
    const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const byPlatform = new Map<string, Record<string, unknown>>((parsed.variations ?? []).map((v: Record<string, unknown>) => [String(v.platform), v]));
    return platforms.map((p) => {
      const v = byPlatform.get(p);
      if (!v) return fallback(p, input);
      return {
        platform: p, headline: String(v.headline ?? ""), caption: String(v.caption ?? ""), body: String(v.body ?? ""),
        cta: String(v.cta ?? input.cta ?? "Learn more"), hashtags: Array.isArray(v.hashtags) ? v.hashtags.map(String).slice(0, 15) : [],
        imagePrompt: String(v.imagePrompt ?? ""), videoPrompt: String(v.videoPrompt ?? ""), format: String(v.format ?? "feed"),
        suggestedTime: String(v.suggestedTime ?? ""), accessibilityText: String(v.accessibilityText ?? ""), complianceNotes: String(v.complianceNotes ?? ""),
      };
    });
  } catch {
    return platforms.map((p) => fallback(p, input));
  }
}
