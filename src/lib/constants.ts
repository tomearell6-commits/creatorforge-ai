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
    name: "Free Trial",
    price: 0,
    credits: 50,
    features: [
      "50 trial credits to explore",
      "Access every studio & tool",
      "Scripts, captions & SEO drafts",
      "Slideshow video renders",
      "Watermarked exports",
      "Upgrade for AI Video & full quality",
    ],
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
  /** How the platform is connected: OAuth (default) or credential form (WordPress). */
  connectType?: "oauth" | "credentials";
  /** WordPress publishes blog articles, not videos. */
  kind?: "video" | "blog";
};

export const PLATFORMS: PlatformMeta[] = [
  { id: "youtube",   name: "YouTube",        emoji: "▶️", envClientId: "YOUTUBE_CLIENT_ID",   color: "#FF0000" },
  { id: "tiktok",    name: "TikTok",         emoji: "🎵", envClientId: "TIKTOK_CLIENT_ID",    color: "#000000" },
  { id: "instagram", name: "Instagram",      emoji: "📸", envClientId: "INSTAGRAM_CLIENT_ID", color: "#E1306C" },
  { id: "facebook",  name: "Facebook Pages", emoji: "📘", envClientId: "FACEBOOK_CLIENT_ID",  color: "#1877F2" },
  { id: "linkedin",  name: "LinkedIn",       emoji: "💼", envClientId: "LINKEDIN_CLIENT_ID",  color: "#0A66C2" },
  { id: "x",         name: "X (Twitter)",    emoji: "✖️", envClientId: "X_CLIENT_ID",         color: "#000000" },
  { id: "pinterest", name: "Pinterest",      emoji: "📌", envClientId: "PINTEREST_CLIENT_ID", color: "#E60023" },
  { id: "wordpress", name: "WordPress",      emoji: "📝", envClientId: "WORDPRESS_UNUSED",    color: "#21759B", connectType: "credentials", kind: "blog" },
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

export const NOTIFICATION_META: Partial<Record<NotificationType, { emoji: string; label: string }>> = {
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
  { href: "/admin/team", label: "Team & Admins" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/wallet", label: "Credit Wallet" },
  { href: "/admin/assistant", label: "AI Assistant" },
  { href: "/admin/seo-audit", label: "SEO Audit" },
  { href: "/admin/leads", label: "Lead Generator" },
  { href: "/admin/design", label: "Design Studio" },
  { href: "/admin/email-assistant", label: "Email Assistant" },
  { href: "/admin/build", label: "Build Studio" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/tutorials", label: "Tutorials" },
  { href: "/admin/support", label: "Support Tickets" },
  { href: "/admin/monitoring", label: "Platform Health" },
  { href: "/admin/audit", label: "Audit Logs" },
  { href: "/admin/settings", label: "System Settings" },
];

/** AI Infrastructure Operations Center — admin submenu. */
export const ADMIN_INFRA_NAV = [
  { href: "/admin/infra", label: "Overview" },
  { href: "/admin/infra/ai", label: "AI Providers" },
  { href: "/admin/infra/payments", label: "Payment Providers" },
  { href: "/admin/infra/storage", label: "Storage Services" },
  { href: "/admin/infra/email", label: "Email Services" },
  { href: "/admin/infra/auth", label: "Authentication" },
  { href: "/admin/infra/publishing", label: "Publishing Providers" },
  { href: "/admin/infra/api-keys", label: "API Keys" },
  { href: "/admin/infra/usage", label: "Usage Analytics" },
  { href: "/admin/infra/costs", label: "Cost Management" },
  { href: "/admin/infra/alerts", label: "Alerts" },
  { href: "/admin/infra/renewals", label: "Renewal Center" },
  { href: "/admin/infra/health", label: "Service Health" },
];

/** Operations Review Center — admin submenu (renewals, credits, keys, costs). */
export const ADMIN_OPS_NAV = [
  { href: "/admin/operations", label: "Overview" },
  { href: "/admin/operations/alerts", label: "Alerts" },
  { href: "/admin/operations/api-keys", label: "API Key Rotation" },
  { href: "/admin/operations/subscriptions", label: "Subscriptions" },
  { href: "/admin/operations/credits", label: "Credit Balances" },
  { href: "/admin/operations/quotas", label: "Usage Quotas" },
  { href: "/admin/operations/database-storage", label: "Database & Storage" },
  { href: "/admin/operations/webhooks", label: "Webhooks" },
  { href: "/admin/operations/health", label: "Service Health" },
  { href: "/admin/operations/checklist", label: "Monthly Checklist" },
  { href: "/admin/operations/calendar", label: "Renewal Calendar" },
  { href: "/admin/operations/cost-forecast", label: "Cost Forecast" },
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

// =====================================================================
// AI Video render tiers (slideshow = free; AI tiers = fal.ai models)
// =====================================================================
export type RenderTier = {
  id: "slideshow" | "ai_standard" | "ai_pro" | "ai_cinematic";
  label: string;
  desc: string;
  /** fal.ai model id; null = the classic image slideshow (no AI video). */
  model: string | null;
  /** Credits charged per render for this tier. */
  credits: number;
};

export const RENDER_TIERS: RenderTier[] = [
  { id: "slideshow",    label: "Slideshow (free motion)", desc: "AI images + Ken Burns motion + captions", model: null, credits: 5 },
  { id: "ai_standard",  label: "AI Video — Standard",     desc: "Real AI footage (MiniMax) · budget",       model: "fal-ai/minimax/video-01", credits: 80 },
  { id: "ai_pro",       label: "AI Video — Pro",          desc: "Higher quality footage (Kling v2)",        model: "fal-ai/kling-video/v2/master/text-to-video", credits: 200 },
  { id: "ai_cinematic", label: "AI Video — Cinematic",    desc: "Top quality + native sound (Veo 3)",       model: "fal-ai/veo3", credits: 350 },
];

export function renderTier(id?: string): RenderTier {
  return RENDER_TIERS.find((t) => t.id === id) ?? RENDER_TIERS[0];
}

// =====================================================================
// SEO Content Studio — credit costs + option sets
// =====================================================================
export const SEO_CREDIT_COSTS = {
  brief: 2,
  article: 20,        // full SEO package generation
  imagePrompt: 1,
  featuredImage: 3,
  publish: 2,         // WordPress publish
  report: 1,
} as const;

// SEO Audit tool — audit types + credit pricing.
export type SeoAuditTypeDef = { id: string; name: string; credits: number; description: string };
export const SEO_AUDIT_TYPES: SeoAuditTypeDef[] = [
  { id: "quick",     name: "Quick Audit",         credits: 25,  description: "Title, meta, headings, images, links, sitemap, robots.txt & structure." },
  { id: "full",      name: "Full Audit",          credits: 100, description: "Complete technical, content, performance & ranking health report." },
  { id: "wordpress", name: "WordPress Audit",     credits: 75,  description: "WP SEO setup, Rank Math/AIOSEO readiness, permalinks, sitemap, blog." },
  { id: "ecommerce", name: "Ecommerce SEO Audit", credits: 120, description: "Product/category pages, schema, duplicate content, image alt, conversion SEO." },
  { id: "blog",      name: "Blog SEO Audit",      credits: 60,  description: "Blog structure, keywords, internal links, readability, topical authority." },
];
export const SEO_AUDIT_FIX_PLAN_CREDITS = 25;
export const SEO_AUDIT_PDF_CREDITS = 5;
export function seoAuditType(id: string): SeoAuditTypeDef {
  return SEO_AUDIT_TYPES.find((t) => t.id === id) ?? SEO_AUDIT_TYPES[0];
}

export const SEO_ARTICLE_TYPES = ["How-to guide", "Listicle", "Product review", "Comparison", "Ultimate guide", "Opinion / thought leadership", "News", "Case study"] as const;
export const SEO_SEARCH_INTENTS = ["Informational", "Commercial", "Transactional", "Navigational"] as const;
export const SEO_WORD_COUNTS = [800, 1200, 1500, 2000, 3000] as const;

// =====================================================================
// Credit Wallet & Crypto Top-Up (Phase 8)
// =====================================================================

export type CreditPackage = {
  slug: string;
  name: string;
  usdPrice: number;
  credits: number;
  bonus: number;
  /** Marketing tag for the UI ("Best value", "Most popular"…). */
  tag?: string;
  highlighted?: boolean;
};

/**
 * Default top-up catalogue. Mirrors the seed in 0010_credit_wallet.sql — the DB
 * `credit_packages` table is authoritative at runtime (admins can edit it); this
 * is the fallback/initial set and keeps the UI working before any DB read.
 */
export const CREDIT_PACKAGES: CreditPackage[] = [
  { slug: "starter",    name: "Starter Pack",    usdPrice: 10,  credits: 1000,  bonus: 0 },
  { slug: "small",      name: "Small Creator",   usdPrice: 25,  credits: 3000,  bonus: 0, tag: "Popular", highlighted: true },
  { slug: "creator",    name: "Creator Pack",    usdPrice: 50,  credits: 7000,  bonus: 0 },
  { slug: "growth",     name: "Growth Pack",     usdPrice: 100, credits: 15000, bonus: 0, tag: "Best value" },
  { slug: "business",   name: "Business Pack",   usdPrice: 250, credits: 40000, bonus: 0 },
  { slug: "enterprise", name: "Enterprise Pack", usdPrice: 500, credits: 90000, bonus: 0 },
];

/** Cryptocurrencies offered at checkout. Provider decides which are settleable. */
export const SUPPORTED_CRYPTO = [
  { code: "BTC",  name: "Bitcoin",      emoji: "₿" },
  { code: "ETH",  name: "Ethereum",     emoji: "Ξ" },
  { code: "USDT", name: "Tether",       emoji: "₮" },
  { code: "USDC", name: "USD Coin",     emoji: "$" },
  { code: "LTC",  name: "Litecoin",     emoji: "Ł" },
  { code: "SOL",  name: "Solana",       emoji: "◎" },
] as const;
export type CryptoCode = (typeof SUPPORTED_CRYPTO)[number]["code"];

/** Custom purchase bounds + conversion (admin-configurable; these are defaults). */
export const MIN_PURCHASE_USD = 10;
export const MAX_PURCHASE_USD = 2000;
/** Base rate for CUSTOM purchases (100 credits per $1 = the Starter rate; named
 *  packages give better rates by design, so custom is never the cheapest path). */
export const CREDITS_PER_USD = 100;
/** Processing fee on credit top-ups. Crypto = 0% (no card fees). */
export const PROCESSING_FEE_PCT = 0;

/** Low-balance warning thresholds (fraction of the plan's monthly allowance). */
export const WALLET_WARN_FRACTION = 0.2;  // subtle warning under 20%
export const WALLET_CRITICAL_FRACTION = 0.1; // stronger warning under 10%

/**
 * Per-action credit estimates surfaced in the UI before generation. These mirror
 * the REAL costs charged elsewhere (CREDIT_COSTS / RENDER_TIERS / SEO_CREDIT_COSTS
 * / CREDITS_PER_SCRIPT) so the estimate matches the actual deduction. Render is a
 * range because it depends on the chosen AI tier.
 */
export type ActionEstimate = { id: string; label: string; credits: number; note?: string };
export const ACTION_CREDIT_ESTIMATES: ActionEstimate[] = [
  { id: "script",        label: "Generate Script",      credits: CREDITS_PER_SCRIPT },
  { id: "voiceover",     label: "Generate Voiceover",   credits: CREDIT_COSTS.voiceover },
  { id: "image",         label: "Generate Image",       credits: CREDIT_COSTS.image },
  { id: "thumbnail",     label: "Generate Thumbnail",   credits: CREDIT_COSTS.thumbnail },
  { id: "seo_article",   label: "Generate SEO Article", credits: SEO_CREDIT_COSTS.article },
  { id: "publish",       label: "Publish to WordPress", credits: SEO_CREDIT_COSTS.publish },
  { id: "render_slideshow", label: "Render Slideshow",  credits: RENDER_TIERS[0].credits },
  { id: "render_ai",     label: "Render AI Video",      credits: RENDER_TIERS[1].credits, note: "Standard tier; Pro/Cinematic cost more" },
  { id: "tool",          label: "AI Text Tool",         credits: 1 },
];

export function actionEstimate(id: string): ActionEstimate | undefined {
  return ACTION_CREDIT_ESTIMATES.find((a) => a.id === id);
}

/** Ledger entry types (must match the DB CHECK-free text values in 0010). */
// =====================================================================
// CreatorsForge Autopilot — campaign automation
// =====================================================================
export const AUTOPILOT_MODES = [
  { id: "manual",   name: "Manual",        desc: "AI creates content. You review and publish manually." },
  { id: "assisted", name: "Assisted",      desc: "AI creates + schedules. You approve the publishing queue." },
  { id: "full",     name: "Full Autopilot", desc: "AI creates, schedules, and publishes on your schedule, then reports." },
] as const;

export const AUTOPILOT_GOALS = [
  { id: "traffic", label: "Traffic" }, { id: "sales", label: "Sales" }, { id: "brand", label: "Brand awareness" },
  { id: "leads", label: "Lead generation" }, { id: "community", label: "Community growth" }, { id: "education", label: "Education" },
] as const;

export const AUTOPILOT_FREQUENCIES = [
  { id: "daily", label: "Daily", perWeek: 7 }, { id: "twice_daily", label: "Twice daily", perWeek: 14 },
  { id: "three_weekly", label: "Three times weekly", perWeek: 3 }, { id: "weekly", label: "Weekly", perWeek: 1 },
  { id: "custom", label: "Custom schedule", perWeek: 5 },
] as const;

export const AUTOPILOT_CHANNELS = [
  { id: "website", label: "Website" }, { id: "wordpress", label: "WordPress" }, { id: "youtube", label: "YouTube" },
  { id: "youtube_shorts", label: "YouTube Shorts" }, { id: "tiktok", label: "TikTok" }, { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook Pages" }, { id: "linkedin", label: "LinkedIn" }, { id: "pinterest", label: "Pinterest" },
  { id: "x", label: "X (Twitter)" }, { id: "email", label: "Email newsletters" },
] as const;

/** Content types Autopilot can plan, with credit estimates (mirror real costs). */
export const AUTOPILOT_CONTENT_TYPES = [
  { id: "ai_shorts",    label: "AI Shorts",       credits: 80, destination: "youtube_shorts" },
  { id: "long_video",   label: "Long-form video", credits: 80, destination: "youtube" },
  { id: "blog",         label: "Blog post",       credits: 20, destination: "wordpress" },
  { id: "seo_article",  label: "SEO article",     credits: 20, destination: "wordpress" },
  { id: "product_ad",   label: "Product ad",      credits: 80, destination: "instagram" },
  { id: "social_post",  label: "Social post",     credits: 1,  destination: "instagram" },
  { id: "newsletter",   label: "Email newsletter", credits: 1, destination: "email" },
] as const;

export function autopilotContentType(id: string) {
  return AUTOPILOT_CONTENT_TYPES.find((c) => c.id === id) ?? AUTOPILOT_CONTENT_TYPES[0];
}

export const AUTOPILOT_JOB_STATUSES = [
  "planned", "queued", "generating", "awaiting_approval", "scheduled", "publishing", "published", "failed",
] as const;

// =====================================================================
// AI Advertising Studio
// =====================================================================
export type AdPlatform = {
  id: string; name: string;
  /** Env vars that enable real OAuth + API for this platform. */
  envKeys: string[];
  formats: string[];           // supported creative types
  supportsPublish: boolean;    // can we create/publish ads via API (after app review)
  supportsReporting: boolean;  // does the API expose performance metrics
  docsUrl: string;
};

export const AD_PLATFORMS: AdPlatform[] = [
  { id: "facebook",  name: "Facebook Ads",  envKeys: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],  formats: ["image", "video", "carousel", "story", "collection", "lead_form"], supportsPublish: true,  supportsReporting: true,  docsUrl: "https://developers.facebook.com/docs/marketing-apis" },
  { id: "instagram", name: "Instagram Ads", envKeys: ["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET"], formats: ["image", "video", "carousel", "story", "short_video"], supportsPublish: true,  supportsReporting: true,  docsUrl: "https://developers.facebook.com/docs/marketing-apis" },
  { id: "google",    name: "Google Ads",    envKeys: ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET"], formats: ["image", "video", "lead_form"], supportsPublish: true, supportsReporting: true, docsUrl: "https://developers.google.com/google-ads/api/docs/start" },
  { id: "youtube",   name: "YouTube Ads",   envKeys: ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET"], formats: ["video", "short_video"], supportsPublish: true, supportsReporting: true, docsUrl: "https://developers.google.com/google-ads/api/docs/start" },
  { id: "linkedin",  name: "LinkedIn Ads",  envKeys: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],  formats: ["image", "video", "carousel", "lead_form"], supportsPublish: true,  supportsReporting: true,  docsUrl: "https://learn.microsoft.com/linkedin/marketing" },
  { id: "pinterest", name: "Pinterest Ads", envKeys: ["PINTEREST_CLIENT_ID", "PINTEREST_CLIENT_SECRET"], formats: ["image", "video", "carousel", "collection"], supportsPublish: true, supportsReporting: true, docsUrl: "https://developers.pinterest.com/docs/api/v5" },
  { id: "tiktok",    name: "TikTok Ads",    envKeys: ["TIKTOK_ADS_CLIENT_ID", "TIKTOK_ADS_CLIENT_SECRET"], formats: ["short_video", "video"], supportsPublish: true, supportsReporting: true, docsUrl: "https://business-api.tiktok.com/portal/docs" },
];
export function adPlatform(id: string): AdPlatform | undefined { return AD_PLATFORMS.find((p) => p.id === id); }

export const AD_OBJECTIVES = [
  { id: "awareness", label: "Brand Awareness" }, { id: "traffic", label: "Traffic" }, { id: "sales", label: "Sales" },
  { id: "leads", label: "Lead Generation" }, { id: "app", label: "App Promotion" }, { id: "video_views", label: "Video Views" },
  { id: "engagement", label: "Engagement" },
] as const;

export const AD_CREATIVE_TYPES = [
  { id: "image", label: "Image Ad" }, { id: "video", label: "Video Ad" }, { id: "carousel", label: "Carousel Ad" },
  { id: "story", label: "Story Ad" }, { id: "short_video", label: "Short Video Ad" }, { id: "lead_form", label: "Lead Form Ad" },
  { id: "collection", label: "Collection Ad" },
] as const;

/** Credits charged per advertising action (real AI only; viewing is free). */
export const AD_CREDIT_COSTS = {
  campaign: 5,        // create + structure a campaign
  copy: 2,            // AI ad copy pack (headlines/primary/desc/CTA/variations)
  image: 3,           // AI image creative
  video: 80,          // AI video creative
  analysis: 2,        // AI campaign analysis/recommendations
} as const;

// =====================================================================
// CreatorsForge Publishing Studio (AI book writing)
// =====================================================================
export const BOOK_CATEGORIES = [
  "Business", "Marketing", "Entrepreneurship", "Self Help", "Personal Development", "Finance", "Investing",
  "Cryptocurrency", "Artificial Intelligence", "Technology", "Programming", "Health", "Fitness", "Nutrition",
  "Cookbooks", "Travel", "Biography", "Memoir", "Children's Books", "Fairy Tales", "Educational", "Academic",
  "Science", "History", "Religion", "Poetry", "Fantasy", "Science Fiction", "Mystery", "Thriller", "Romance",
  "Horror", "Adventure", "Young Adult", "Graphic Novel Planning", "Comic Script", "Short Stories",
  "Product Guides", "Training Manuals", "Ebooks", "Lead Magnets", "Workbooks", "Journals", "Prompt Books", "Custom Category",
] as const;

export const BOOK_WRITING_STYLES = ["Conversational", "Professional", "Academic", "Storytelling", "Instructional", "Inspirational", "Playful"] as const;
export const BOOK_TONES = ["Friendly", "Authoritative", "Witty", "Empathetic", "Bold", "Calm", "Neutral"] as const;
export const BOOK_READING_LEVELS = ["Children", "Young Adult", "General", "Professional", "Expert"] as const;
export const BOOK_EXPORT_FORMATS = ["pdf", "docx", "epub", "md", "txt", "html"] as const;

/** Credits charged per publishing action (real AI/conversion only; viewing free). */
export const BOOK_CREDIT_COSTS = {
  concept: 2,
  outline: 5,
  chapter: 10,
  chapterTool: 2,     // rewrite/expand/improve/etc.
  cover: 3,
  illustration: 3,
  marketing: 3,
  export: 1,
} as const;

export const LEDGER_ENTRY_TYPES = [
  "monthly_renewal", "topup_purchase", "refund", "bonus", "promo",
  "manual_adjustment", "generation", "rendering", "publishing", "admin_adjustment",
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];
