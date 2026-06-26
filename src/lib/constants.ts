/**
 * Static app configuration: content categories and pricing plans.
 * Kept in one place so UI, API, and database seed stay in sync.
 */

export type Category = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
};

export const CATEGORIES: Category[] = [
  { slug: "horror-stories", name: "Horror Stories", description: "Spine-chilling narrated horror videos.", emoji: "👻" },
  { slug: "motivational", name: "Motivational Videos", description: "Inspiring, high-energy motivational clips.", emoji: "🔥" },
  { slug: "anime-stories", name: "Anime Stories", description: "Anime-styled narrative content.", emoji: "🌸" },
  { slug: "business-marketing", name: "Business Marketing", description: "Marketing copy and brand storytelling.", emoji: "📈" },
  { slug: "product-ads", name: "Product Ads", description: "Short, punchy product advertisements.", emoji: "🛍️" },
  { slug: "educational", name: "Educational Content", description: "Explainers and how-to scripts.", emoji: "🎓" },
  { slug: "kids-stories", name: "Kids Stories", description: "Friendly, age-appropriate stories for children.", emoji: "🧸" },
  { slug: "ai-news", name: "AI News", description: "Breaking news and updates from the AI world.", emoji: "🤖" },
  { slug: "finance", name: "Finance Content", description: "Money, markets, and personal-finance scripts.", emoji: "💰" },
  { slug: "relationship-stories", name: "Relationship Stories", description: "Emotional relationship narratives.", emoji: "💞" },
  { slug: "podcast-scripts", name: "Podcast Scripts", description: "Long-form conversational podcast outlines.", emoji: "🎙️" },
  { slug: "blog-posts", name: "Blog Posts", description: "SEO-friendly written blog articles.", emoji: "✍️" },
  { slug: "social-captions", name: "Social Media Captions", description: "Scroll-stopping captions for any platform.", emoji: "📱" },
];

export type Plan = {
  id: string;
  name: string;
  price: number; // USD / month
  credits: number;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    credits: 20,
    features: ["20 credits / month", "Basic script generation", "1 project", "Community support"],
  },
  {
    id: "creator",
    name: "Creator",
    price: 19,
    credits: 500,
    features: ["500 credits / month", "All content categories", "Unlimited projects", "Email support"],
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    credits: 2000,
    features: ["2,000 credits / month", "Priority generation", "Team workspace (soon)", "Priority support"],
  },
  {
    id: "agency",
    name: "Agency",
    price: 149,
    credits: 8000,
    features: ["8,000 credits / month", "API access (soon)", "White-label (soon)", "Dedicated support"],
  },
];

/** Credits charged per real AI script generation (placeholder engine is free). */
export const CREDITS_PER_SCRIPT = 1;

/**
 * Credits charged per real media generation. Placeholder providers are free;
 * these apply only when a real provider (ElevenLabs / OpenAI / …) is active.
 */
export const CREDIT_COSTS = {
  voiceover: 2,
  image: 3,
  thumbnail: 3,
  render: 5,
} as const;

/** Monthly credit allowance for a plan id (used when granting on payment). */
export function planCredits(planId: string): number {
  return PLANS.find((p) => p.id === planId)?.credits ?? 0;
}

/** Tone options offered in the script generator. */
export const TONES = [
  { value: "engaging", label: "Engaging" },
  { value: "dramatic", label: "Dramatic" },
  { value: "humorous", label: "Humorous" },
  { value: "inspirational", label: "Inspirational" },
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
] as const;

/** Length presets — each maps to an approximate runtime and an output token cap. */
export const LENGTHS = [
  { value: "short", label: "Short (~30s)", words: 110, maxTokens: 1024 },
  { value: "medium", label: "Medium (~60s)", words: 280, maxTokens: 2048 },
  { value: "long", label: "Long (2–3 min)", words: 600, maxTokens: 4096 },
] as const;

export type ToneValue = (typeof TONES)[number]["value"];
export type LengthValue = (typeof LENGTHS)[number]["value"];

export const DEFAULT_TONE: ToneValue = "engaging";
export const DEFAULT_LENGTH: LengthValue = "medium";
