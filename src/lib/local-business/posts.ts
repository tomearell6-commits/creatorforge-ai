/**
 * Local Business post generation (SERVER-ONLY). Produces professional Google
 * Business Profile post copy + an image prompt + optional social variations.
 * Claude when configured; deterministic fallback otherwise.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { lbPostTypeLabel, type LbPostType } from "@/config/localBusiness";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export type PostInput = {
  postType: LbPostType; topic?: string; offer?: string; startDate?: string; endDate?: string;
  cta?: string; audience?: string; tone?: string; language?: string;
};
export type PostOutput = {
  mainText: string; shortText: string; cta: string; offerDetails?: string; eventDetails?: string;
  imagePrompt: string; imageDescription: string; suggestedTime: string;
  socialVariations: string[]; complianceWarning?: string;
};

export async function generateBusinessPost(businessName: string, category: string | null, input: PostInput): Promise<PostOutput> {
  const label = lbPostTypeLabel(input.postType);
  const fallback: PostOutput = {
    mainText: `${label} from ${businessName}. ${input.topic ?? "We have news to share with our community."}${input.offer ? ` ${input.offer}.` : ""}`,
    shortText: `${label}: ${input.topic ?? businessName}`,
    cta: input.cta || "Learn more",
    offerDetails: input.offer || undefined,
    eventDetails: input.startDate ? `${input.startDate}${input.endDate ? ` – ${input.endDate}` : ""}` : undefined,
    imagePrompt: `Clean, professional promotional image for ${businessName} (${category ?? "local business"}), ${label.toLowerCase()}, bright and inviting, no text overlay`,
    imageDescription: `Promotional image for ${businessName} ${label.toLowerCase()}`,
    suggestedTime: "Weekday mornings (9–11am) tend to perform well for local posts.",
    socialVariations: [],
  };
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 700,
      system: `You write Google Business Profile posts for local businesses. Return ONLY JSON {"mainText":"…","shortText":"…","cta":"…","offerDetails":"…","eventDetails":"…","imagePrompt":"…","imageDescription":"…","suggestedTime":"…","socialVariations":["…"],"complianceWarning":"…"}. Keep it honest, no false claims/guarantees. mainText ~1500 chars max. complianceWarning only if the topic needs a disclaimer (health/legal/financial), else empty.`,
      messages: [{ role: "user", content: `Business: ${businessName} (${category ?? "local business"})\nPost type: ${label}\nTopic: ${input.topic ?? "(none)"}\nOffer: ${input.offer ?? "(none)"}\nDates: ${input.startDate ?? ""} ${input.endDate ?? ""}\nCTA: ${input.cta ?? "(suggest one)"}\nAudience: ${input.audience ?? "local customers"}\nTone: ${input.tone ?? "professional, friendly"}\nLanguage: ${input.language ?? "English"}` }],
    });
    const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const p = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return {
      mainText: String(p.mainText || fallback.mainText),
      shortText: String(p.shortText || fallback.shortText),
      cta: String(p.cta || fallback.cta),
      offerDetails: p.offerDetails ? String(p.offerDetails) : fallback.offerDetails,
      eventDetails: p.eventDetails ? String(p.eventDetails) : fallback.eventDetails,
      imagePrompt: String(p.imagePrompt || fallback.imagePrompt),
      imageDescription: String(p.imageDescription || fallback.imageDescription),
      suggestedTime: String(p.suggestedTime || fallback.suggestedTime),
      socialVariations: Array.isArray(p.socialVariations) ? p.socialVariations.map(String).slice(0, 4) : [],
      complianceWarning: p.complianceWarning ? String(p.complianceWarning) : undefined,
    };
  } catch { return fallback; }
}
