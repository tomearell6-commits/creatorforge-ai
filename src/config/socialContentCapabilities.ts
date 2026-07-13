/**
 * Social Business Studio — content capability configuration. Central rules for
 * each content type so platform logic isn't hardcoded across components.
 */
import type { SocialProviderId } from "./socialProviderCapabilities";

export type SocialContentType =
  | "announcement" | "product_promotion" | "service_promotion" | "educational" | "company_news"
  | "seasonal" | "event" | "customer_appreciation" | "thought_leadership" | "case_study"
  | "hiring" | "lead_generation" | "behind_the_scenes" | "community" | "limited_time_offer";

export interface SocialContentCapability {
  contentType: SocialContentType;
  label: string;
  supportedPlatforms: SocialProviderId[];
  metadataFields: string[];
  promotionOptions: string[];
  estimatedCredits: { base: number; perVariation: number; image: number; video: number };
  requiredAccountType: string;
}

const ALL: SocialProviderId[] = ["facebook", "instagram", "linkedin", "tiktok", "youtube", "pinterest", "x", "threads", "google_business", "wordpress"];
const VISUAL: SocialProviderId[] = ["facebook", "instagram", "linkedin", "pinterest", "x", "threads", "google_business"];
const B2B: SocialProviderId[] = ["linkedin", "x", "facebook"];

function cap(contentType: SocialContentType, label: string, platforms: SocialProviderId[], extra?: Partial<SocialContentCapability>): SocialContentCapability {
  return {
    contentType, label, supportedPlatforms: platforms,
    metadataFields: ["headline", "caption", "body", "cta", "hashtags", "image_prompt", "video_prompt", "format", "suggested_time", "accessibility_text", "compliance_notes"],
    promotionOptions: ["paid_ad", "email_campaign", "website_post", "cross_platform", "autopilot"],
    estimatedCredits: { base: 5, perVariation: 2, image: 5, video: 30 },
    requiredAccountType: "any",
    ...extra,
  };
}

export const SOCIAL_CONTENT_CAPABILITIES: Record<SocialContentType, SocialContentCapability> = {
  announcement: cap("announcement", "Announcement", ALL),
  product_promotion: cap("product_promotion", "Product Promotion", VISUAL),
  service_promotion: cap("service_promotion", "Service Promotion", VISUAL),
  educational: cap("educational", "Educational Post", ALL),
  company_news: cap("company_news", "Company News", ALL),
  seasonal: cap("seasonal", "Seasonal Campaign", VISUAL),
  event: cap("event", "Event", ["facebook", "instagram", "linkedin", "x", "google_business"]),
  customer_appreciation: cap("customer_appreciation", "Customer Appreciation", VISUAL),
  thought_leadership: cap("thought_leadership", "Thought Leadership", B2B),
  case_study: cap("case_study", "Case Study", B2B),
  hiring: cap("hiring", "Hiring Post", ["linkedin", "facebook", "x"]),
  lead_generation: cap("lead_generation", "Lead Generation", B2B),
  behind_the_scenes: cap("behind_the_scenes", "Behind the Scenes", ["instagram", "tiktok", "facebook", "youtube"]),
  community: cap("community", "Community Post", ALL),
  limited_time_offer: cap("limited_time_offer", "Limited-Time Offer", VISUAL),
};

export const SOCIAL_CONTENT_TYPES = Object.keys(SOCIAL_CONTENT_CAPABILITIES) as SocialContentType[];

export function getSocialContentCapability(t: SocialContentType): SocialContentCapability | null {
  return SOCIAL_CONTENT_CAPABILITIES[t] ?? null;
}

export function socialContentTypeLabel(t: SocialContentType): string {
  return SOCIAL_CONTENT_CAPABILITIES[t]?.label ?? t;
}

// Credit prices for Social Business AI actions (configurable).
export const SOCIAL_CREDIT_COSTS = {
  content_base: 5, per_variation: 2, image: 5, video: 30, campaign: 12,
  reply_draft: 2, report: 15, profile_optimize: 10,
} as const;
