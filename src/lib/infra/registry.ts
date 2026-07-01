/**
 * Provider Registry — the single catalogue of every external service CreatorsForge
 * depends on. This is static metadata (safe to import on the client). Whether a
 * provider is actually *configured* (its env keys are present) is resolved
 * server-side in status.ts, never here.
 */

export type ProviderCategory =
  | "ai" | "payment" | "storage" | "email" | "auth" | "publishing" | "infra";

export type AuthType = "api_key" | "oauth" | "credentials" | "hmac_webhook" | "smtp" | "none";

export type ProviderDef = {
  id: string;
  name: string;
  category: ProviderCategory;
  /** Env vars that must ALL be present for the provider to be considered live. */
  envKeys: string[];
  /** Extra env vars that enable richer behaviour but aren't required. */
  optionalEnvKeys?: string[];
  authType: AuthType;
  apiEndpoint?: string;
  docsUrl?: string;
  supportUrl?: string;
  renewalRequired: boolean;
  supportsUsageReporting: boolean;
  supportsBalanceReporting: boolean;
  supportsHealthChecks: boolean;
  supportsWebhooks: boolean;
  /** Short note for the admin card. */
  note?: string;
};

export const PROVIDERS: ProviderDef[] = [
  // ---- AI providers ----
  { id: "anthropic", name: "Anthropic Claude", category: "ai", envKeys: ["ANTHROPIC_API_KEY"], authType: "api_key",
    apiEndpoint: "https://api.anthropic.com", docsUrl: "https://docs.anthropic.com", supportUrl: "https://support.anthropic.com",
    renewalRequired: false, supportsUsageReporting: false, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Script, SEO & text-tool generation (claude-opus-4-8)." },
  { id: "openai", name: "OpenAI", category: "ai", envKeys: ["OPENAI_API_KEY"], authType: "api_key",
    apiEndpoint: "https://api.openai.com", docsUrl: "https://platform.openai.com/docs", supportUrl: "https://help.openai.com",
    renewalRequired: false, supportsUsageReporting: true, supportsBalanceReporting: true, supportsHealthChecks: true, supportsWebhooks: false,
    note: "gpt-image-1 image generation (quality: high)." },
  { id: "elevenlabs", name: "ElevenLabs", category: "ai", envKeys: ["ELEVENLABS_API_KEY"], authType: "api_key",
    apiEndpoint: "https://api.elevenlabs.io", docsUrl: "https://elevenlabs.io/docs", supportUrl: "https://help.elevenlabs.io",
    renewalRequired: true, supportsUsageReporting: true, supportsBalanceReporting: true, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Voiceover synthesis. Credit-metered plan." },
  { id: "gemini", name: "Google Gemini / Imagen", category: "ai", envKeys: ["GEMINI_API_KEY"], authType: "api_key",
    apiEndpoint: "https://generativelanguage.googleapis.com", docsUrl: "https://ai.google.dev/docs", supportUrl: "https://ai.google.dev/support",
    renewalRequired: false, supportsUsageReporting: false, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Alternate image provider (needs Cloud billing for Imagen)." },
  { id: "shotstack", name: "Shotstack", category: "ai", envKeys: ["SHOTSTACK_API_KEY"], optionalEnvKeys: ["SHOTSTACK_ENV"], authType: "api_key",
    apiEndpoint: "https://api.shotstack.io", docsUrl: "https://shotstack.io/docs", supportUrl: "https://shotstack.io/support",
    renewalRequired: true, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: true,
    note: "Final MP4 render (timeline assembly)." },
  { id: "fal", name: "fal.ai (Video)", category: "ai", envKeys: ["FAL_KEY"], optionalEnvKeys: ["VIDEO_PROVIDER"], authType: "api_key",
    apiEndpoint: "https://queue.fal.run", docsUrl: "https://fal.ai/docs", supportUrl: "https://fal.ai/support",
    renewalRequired: false, supportsUsageReporting: true, supportsBalanceReporting: true, supportsHealthChecks: true, supportsWebhooks: false,
    note: "AI video footage (MiniMax / Kling / Veo 3)." },

  // ---- Payment providers ----
  { id: "nowpayments", name: "NOWPayments (Crypto)", category: "payment", envKeys: ["NOWPAYMENTS_API_KEY"], optionalEnvKeys: ["NOWPAYMENTS_IPN_SECRET"], authType: "hmac_webhook",
    apiEndpoint: "https://api.nowpayments.io", docsUrl: "https://documenter.getpostman.com/view/7907941/2s93JusNJt", supportUrl: "https://nowpayments.io/help",
    renewalRequired: false, supportsUsageReporting: false, supportsBalanceReporting: true, supportsHealthChecks: true, supportsWebhooks: true,
    note: "Crypto checkout + credit top-ups (IPN webhook)." },
  { id: "paddle", name: "Paddle", category: "payment", envKeys: ["NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"], optionalEnvKeys: ["PADDLE_WEBHOOK_SECRET", "PADDLE_API_KEY"], authType: "hmac_webhook",
    apiEndpoint: "https://api.paddle.com", docsUrl: "https://developer.paddle.com", supportUrl: "https://www.paddle.com/support",
    renewalRequired: false, supportsUsageReporting: false, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: true,
    note: "Card subscriptions (deferred — crypto-first)." },

  // ---- Storage providers ----
  { id: "supabase-storage", name: "Supabase Storage", category: "storage", envKeys: ["SUPABASE_URL"], optionalEnvKeys: ["SUPABASE_SERVICE_ROLE_KEY"], authType: "api_key",
    apiEndpoint: "https://supabase.com", docsUrl: "https://supabase.com/docs/guides/storage", supportUrl: "https://supabase.com/support",
    renewalRequired: true, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Media bucket (generated images/audio/video)." },
  { id: "cloudflare-r2", name: "Cloudflare R2", category: "storage", envKeys: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"], authType: "api_key",
    apiEndpoint: "https://cloudflarestorage.com", docsUrl: "https://developers.cloudflare.com/r2", supportUrl: "https://dash.cloudflare.com",
    renewalRequired: true, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Optional object storage (not yet wired)." },

  // ---- Email providers ----
  { id: "resend", name: "Resend", category: "email", envKeys: ["RESEND_API_KEY"], authType: "api_key",
    apiEndpoint: "https://api.resend.com", docsUrl: "https://resend.com/docs", supportUrl: "https://resend.com/support",
    renewalRequired: true, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: true,
    note: "Auth/transactional email (SMTP via Supabase)." },
  { id: "brevo", name: "Brevo", category: "email", envKeys: ["BREVO_API_KEY"], authType: "api_key",
    apiEndpoint: "https://api.brevo.com", docsUrl: "https://developers.brevo.com", supportUrl: "https://help.brevo.com",
    renewalRequired: true, supportsUsageReporting: true, supportsBalanceReporting: true, supportsHealthChecks: true, supportsWebhooks: true,
    note: "Optional marketing/transactional email." },

  // ---- Authentication providers ----
  { id: "supabase-auth", name: "Supabase Auth", category: "auth", envKeys: ["NEXT_PUBLIC_SUPABASE_URL"], authType: "api_key",
    apiEndpoint: "https://supabase.com", docsUrl: "https://supabase.com/docs/guides/auth", supportUrl: "https://supabase.com/support",
    renewalRequired: false, supportsUsageReporting: false, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Email/password + session management." },
  { id: "google-oauth", name: "Google OAuth", category: "auth", envKeys: ["NEXT_PUBLIC_SUPABASE_URL"], authType: "oauth",
    docsUrl: "https://console.cloud.google.com/apis/credentials", supportUrl: "https://support.google.com/cloud",
    renewalRequired: false, supportsUsageReporting: false, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Social sign-in (configured in Supabase Auth)." },

  // ---- Publishing providers ----
  { id: "youtube", name: "YouTube Data API", category: "publishing", envKeys: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"], authType: "oauth",
    docsUrl: "https://developers.google.com/youtube/v3", supportUrl: "https://support.google.com/youtube",
    renewalRequired: false, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Video upload. Daily quota units." },
  { id: "instagram", name: "Instagram Graph", category: "publishing", envKeys: ["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET"], authType: "oauth",
    docsUrl: "https://developers.facebook.com/docs/instagram-api", supportUrl: "https://developers.facebook.com/support",
    renewalRequired: false, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false },
  { id: "facebook", name: "Facebook Pages", category: "publishing", envKeys: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"], authType: "oauth",
    docsUrl: "https://developers.facebook.com/docs/pages-api", supportUrl: "https://developers.facebook.com/support",
    renewalRequired: false, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false },
  { id: "tiktok", name: "TikTok Content", category: "publishing", envKeys: ["TIKTOK_CLIENT_ID", "TIKTOK_CLIENT_SECRET"], authType: "oauth",
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api", supportUrl: "https://developers.tiktok.com/support",
    renewalRequired: false, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false },
  { id: "linkedin", name: "LinkedIn", category: "publishing", envKeys: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"], authType: "oauth",
    docsUrl: "https://learn.microsoft.com/linkedin", supportUrl: "https://www.linkedin.com/help/linkedin",
    renewalRequired: false, supportsUsageReporting: false, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false },
  { id: "x", name: "X (Twitter) API", category: "publishing", envKeys: ["X_CLIENT_ID", "X_CLIENT_SECRET"], authType: "oauth",
    docsUrl: "https://developer.twitter.com/en/docs", supportUrl: "https://developer.twitter.com/en/support",
    renewalRequired: true, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Posting may require a paid API tier." },
  { id: "pinterest", name: "Pinterest", category: "publishing", envKeys: ["PINTEREST_CLIENT_ID", "PINTEREST_CLIENT_SECRET"], authType: "oauth",
    docsUrl: "https://developers.pinterest.com/docs", supportUrl: "https://help.pinterest.com",
    renewalRequired: false, supportsUsageReporting: false, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false },
  { id: "wordpress", name: "WordPress (REST)", category: "publishing", envKeys: [], authType: "credentials",
    docsUrl: "https://developer.wordpress.org/rest-api", supportUrl: "https://wordpress.org/support",
    renewalRequired: false, supportsUsageReporting: false, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Per-site Application Passwords (stored encrypted, per user)." },

  // ---- Core infra ----
  { id: "supabase-db", name: "Supabase Postgres", category: "infra", envKeys: ["NEXT_PUBLIC_SUPABASE_URL"], authType: "api_key",
    apiEndpoint: "https://supabase.com", docsUrl: "https://supabase.com/docs/guides/database", supportUrl: "https://supabase.com/support",
    renewalRequired: true, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Primary database." },
  { id: "upstash-redis", name: "Upstash Redis", category: "infra", envKeys: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"], authType: "api_key",
    apiEndpoint: "https://upstash.com", docsUrl: "https://upstash.com/docs", supportUrl: "https://upstash.com/docs/common/help/support",
    renewalRequired: false, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Distributed rate limiting (falls back to in-memory)." },
  { id: "sentry", name: "Sentry", category: "infra", envKeys: ["SENTRY_DSN"], authType: "api_key",
    apiEndpoint: "https://sentry.io", docsUrl: "https://docs.sentry.io", supportUrl: "https://sentry.io/support",
    renewalRequired: true, supportsUsageReporting: true, supportsBalanceReporting: false, supportsHealthChecks: true, supportsWebhooks: false,
    note: "Error monitoring (server-side captureError)." },
];

export const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  ai: "AI Providers", payment: "Payment Providers", storage: "Storage Services",
  email: "Email Services", auth: "Authentication", publishing: "Publishing Providers", infra: "Core Infrastructure",
};

export function providersByCategory(category: ProviderCategory): ProviderDef[] {
  return PROVIDERS.filter((p) => p.category === category);
}
export function getProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
