/**
 * Static app configuration: content categories and pricing plans.
 * Kept in one place so UI, API, and database seed stay in sync.
 */
import type { SocialPlatform, WorkspaceRole, Visibility, NotificationType } from "@/lib/types";

export type Category = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  /** Sub-niches shown in the homepage niche explorer preview. */
  subcategories: string[];
  /** What the platform produces for this niche (pipeline output). */
  produces: string;
};

// Output presets reused across niches.
const VIDEO_OUTPUT = "Script · Voiceover · Scene images · Captions · MP4 video";

export const CATEGORIES: Category[] = [
  {
    slug: "horror-stories",
    name: "Horror Stories",
    description: "Spine-chilling narrated horror videos.",
    emoji: "👻",
    subcategories: ["True scary stories", "Creepypasta", "Urban legends", "Haunted places", "Reddit r/nosleep"],
    produces: VIDEO_OUTPUT,
  },
  {
    slug: "motivational",
    name: "Motivational Videos",
    description: "Inspiring, high-energy motivational clips.",
    emoji: "🔥",
    subcategories: ["Discipline & hustle", "Stoic wisdom", "Morning motivation", "Gym & fitness", "Success mindset"],
    produces: VIDEO_OUTPUT,
  },
  {
    slug: "anime-stories",
    name: "Anime Stories",
    description: "Anime-styled narrative content.",
    emoji: "🌸",
    subcategories: ["Anime recaps", "Original tales", "Character breakdowns", "Manga summaries", "Top-10 rankings"],
    produces: VIDEO_OUTPUT,
  },
  {
    slug: "business-marketing",
    name: "Business Marketing",
    description: "Marketing copy and brand storytelling.",
    emoji: "📈",
    subcategories: ["Brand storytelling", "Sales pages", "Case studies", "Value propositions", "Explainer ads"],
    produces: VIDEO_OUTPUT,
  },
  {
    slug: "product-ads",
    name: "Product Ads",
    description: "Short, punchy product advertisements.",
    emoji: "🛍️",
    subcategories: ["UGC-style ads", "Feature highlights", "Testimonials", "Launch promos", "Discount offers"],
    produces: VIDEO_OUTPUT,
  },
  {
    slug: "educational",
    name: "Educational Content",
    description: "Explainers and how-to scripts.",
    emoji: "🎓",
    subcategories: ["How-to tutorials", "Explainers", "“Top 5” listicles", "Science facts", "History lessons"],
    produces: VIDEO_OUTPUT,
  },
  {
    slug: "kids-stories",
    name: "Kids Stories",
    description: "Friendly, age-appropriate stories for children.",
    emoji: "🧸",
    subcategories: ["Bedtime stories", "Fairy tales", "Moral lessons", "Animal adventures", "Nursery rhymes"],
    produces: VIDEO_OUTPUT,
  },
  {
    slug: "ai-news",
    name: "AI News",
    description: "Breaking news and updates from the AI world.",
    emoji: "🤖",
    subcategories: ["Model releases", "Tool roundups", "Industry headlines", "AI tutorials", "Ethics & debates"],
    produces: VIDEO_OUTPUT,
  },
  {
    slug: "finance",
    name: "Finance Content",
    description: "Money, markets, and personal-finance scripts.",
    emoji: "💰",
    subcategories: ["Personal finance tips", "Crypto updates", "Stock breakdowns", "Budgeting", "Side hustles"],
    produces: VIDEO_OUTPUT,
  },
  {
    slug: "relationship-stories",
    name: "Relationship Stories",
    description: "Emotional relationship narratives.",
    emoji: "💞",
    subcategories: ["Love stories", "Breakup advice", "Dating tips", "Confessions", "Reddit r/AITA"],
    produces: VIDEO_OUTPUT,
  },
  {
    slug: "podcast-scripts",
    name: "Podcast Scripts",
    description: "Long-form conversational podcast outlines.",
    emoji: "🎙️",
    subcategories: ["Interview outlines", "Solo episodes", "Show notes", "Intro & outro", "Q&A segments"],
    produces: "Episode script · Voiceover · Show notes",
  },
  {
    slug: "blog-posts",
    name: "Blog Posts",
    description: "SEO-friendly written blog articles.",
    emoji: "✍️",
    subcategories: ["SEO articles", "Listicles", "How-to guides", "Product reviews", "Opinion pieces"],
    produces: "SEO article · Headings · Meta description",
  },
  {
    slug: "social-captions",
    name: "Social Media Captions",
    description: "Scroll-stopping captions for any platform.",
    emoji: "📱",
    subcategories: ["Instagram", "TikTok", "YouTube Shorts", "LinkedIn", "X / Threads"],
    produces: "Hooks · Captions · Hashtags",
  },
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

// =====================================================================
// Phase 6: publishing platforms, roles, and option sets
// =====================================================================

export type PlatformMeta = {
  id: SocialPlatform;
  name: string;
  emoji: string;
  /** Whether real OAuth is wired (env client id present). Placeholder otherwise. */
  envClientId: string;
  color: string;
};

export const PLATFORMS: PlatformMeta[] = [
  { id: "youtube",   name: "YouTube",        emoji: "▶️", envClientId: "YOUTUBE_CLIENT_ID",   color: "#FF0000" },
  { id: "tiktok",    name: "TikTok",         emoji: "🎵", envClientId: "TIKTOK_CLIENT_ID",    color: "#000000" },
  { id: "instagram", name: "Instagram",      emoji: "📸", envClientId: "INSTAGRAM_CLIENT_ID", color: "#E1306C" },
  { id: "facebook",  name: "Facebook Pages", emoji: "📘", envClientId: "FACEBOOK_CLIENT_ID",  color: "#1877F2" },
  { id: "linkedin",  name: "LinkedIn",       emoji: "💼", envClientId: "LINKEDIN_CLIENT_ID",  color: "#0A66C2" },
  { id: "x",         name: "X (Twitter)",    emoji: "✖️", envClientId: "X_CLIENT_ID",         color: "#000000" },
  { id: "pinterest", name: "Pinterest",      emoji: "📌", envClientId: "PINTEREST_CLIENT_ID", color: "#E60023" },
];

export const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "public",   label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "private",  label: "Private" },
];

export const WORKSPACE_ROLES: { value: WorkspaceRole; label: string; desc: string }[] = [
  { value: "owner",  label: "Owner",  desc: "Full control, billing, members." },
  { value: "admin",  label: "Admin",  desc: "Manage members and all content." },
  { value: "editor", label: "Editor", desc: "Create, edit, and publish content." },
  { value: "viewer", label: "Viewer", desc: "Read-only access." },
];

/** Role capability map used for authorization on Phase 6 APIs. */
export const ROLE_CAN: Record<WorkspaceRole, { manageMembers: boolean; publish: boolean; edit: boolean }> = {
  owner:  { manageMembers: true,  publish: true,  edit: true },
  admin:  { manageMembers: true,  publish: true,  edit: true },
  editor: { manageMembers: false, publish: true,  edit: true },
  viewer: { manageMembers: false, publish: false, edit: false },
};

export const NOTIFICATION_META: Record<NotificationType, { emoji: string; label: string }> = {
  render_complete:      { emoji: "🎬", label: "Render complete" },
  publish_success:      { emoji: "✅", label: "Published" },
  publish_failed:       { emoji: "⚠️", label: "Publish failed" },
  credits_low:          { emoji: "🪙", label: "Credits low" },
  subscription_renewed: { emoji: "🔁", label: "Subscription renewed" },
  storage_full:         { emoji: "💾", label: "Storage nearly full" },
};

export const AUTOMATION_TRIGGERS = [
  { value: "render_complete",   label: "When a render completes" },
  { value: "publish_success",   label: "When publishing succeeds" },
  { value: "credits_low",       label: "When credits fall below a threshold" },
  { value: "project_completed", label: "When a project is completed" },
] as const;

export const AUTOMATION_ACTIONS = [
  { value: "schedule_publish", label: "Schedule publishing" },
  { value: "notify",           label: "Notify the user" },
  { value: "warn",             label: "Show a warning" },
  { value: "archive",          label: "Archive after a period" },
] as const;

export const LOW_CREDITS_THRESHOLD = 10;

// =====================================================================
// Phase 7: enterprise / admin / business operations
// =====================================================================

/** Admin portal navigation (separate from the user dashboard). */
export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/support", label: "Support Tickets" },
  { href: "/admin/monitoring", label: "Platform Health" },
  { href: "/admin/audit", label: "Audit Logs" },
  { href: "/admin/settings", label: "System Settings" },
];

export const TICKET_STATUSES = ["open", "pending", "resolved", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TICKET_CATEGORIES = ["Billing", "Technical", "Publishing", "Account", "Feature request", "Other"] as const;

export const API_SCOPES = [
  { value: "scripts:read", label: "Read scripts" },
  { value: "scripts:write", label: "Generate scripts" },
  { value: "media:write", label: "Generate media" },
  { value: "publish:write", label: "Publish content" },
  { value: "analytics:read", label: "Read analytics" },
] as const;

/** Auditable actions (kept in one place so logs/filters stay consistent). */
export const AUDIT_ACTIONS = [
  "auth.login", "auth.logout", "project.created", "content.published",
  "payment.completed", "credits.changed", "role.changed", "subscription.updated",
  "apikey.created", "apikey.revoked", "workspace.modified", "user.suspended", "user.activated",
] as const;

export const DEFAULT_AFFILIATE_RATE = 0.3; // 30% commission
export const REFERRAL_REWARD_CREDITS = 50; // credits granted when a referral converts
