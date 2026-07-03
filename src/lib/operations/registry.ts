/**
 * Operations Review Center — provider registry.
 *
 * One entry per external dependency CreatorsForge relies on to run 24/7.
 * This is the seed catalogue: first load upserts these into
 * operations_providers, and the admin then maintains the operational fields
 * (plan, cost, renewal date, notes) in the UI. `envKeys` lets the overview
 * mark providers green/gray from live configuration without exposing values.
 */

export type OpsCategory =
  | "ai" | "seo" | "leads" | "payments" | "storage"
  | "database" | "email" | "publishing" | "infrastructure";

export type OpsProviderDef = {
  id: string;
  name: string;
  category: OpsCategory;
  envKeys: string[];          // configured when ANY of these is set ([] = external, manual)
  creditBased?: boolean;      // shows on the Credit Balances page
  quotaTypes?: string[];      // shows on the Usage Quotas page
  hasWebhook?: boolean;       // shows on the Webhook Health page
  webhookPath?: string;
  rotationDays?: number;      // default API-key rotation interval
  loginUrl?: string;
  supportUrl?: string;
  docsUrl?: string;
};

export const OPS_PROVIDERS: OpsProviderDef[] = [
  // ---- AI providers ----
  { id: "anthropic", name: "Anthropic Claude", category: "ai", envKeys: ["ANTHROPIC_API_KEY"], creditBased: true, quotaTypes: ["tokens"], rotationDays: 90, loginUrl: "https://console.anthropic.com", docsUrl: "https://docs.anthropic.com" },
  { id: "openai", name: "OpenAI", category: "ai", envKeys: ["OPENAI_API_KEY"], creditBased: true, quotaTypes: ["tokens", "requests"], rotationDays: 90, loginUrl: "https://platform.openai.com", docsUrl: "https://platform.openai.com/docs" },
  { id: "elevenlabs", name: "ElevenLabs", category: "ai", envKeys: ["ELEVENLABS_API_KEY"], creditBased: true, quotaTypes: ["characters"], rotationDays: 90, loginUrl: "https://elevenlabs.io/app", docsUrl: "https://elevenlabs.io/docs" },
  { id: "fal", name: "fal.ai (images + video)", category: "ai", envKeys: ["FAL_KEY", "FAL_API_KEY"], creditBased: true, quotaTypes: ["requests"], rotationDays: 90, loginUrl: "https://fal.ai/dashboard", docsUrl: "https://fal.ai/docs" },
  { id: "shotstack", name: "Shotstack (video render)", category: "ai", envKeys: ["SHOTSTACK_API_KEY"], creditBased: true, quotaTypes: ["render_minutes"], rotationDays: 90, loginUrl: "https://dashboard.shotstack.io", docsUrl: "https://shotstack.io/docs" },
  { id: "heygen", name: "HeyGen (avatars)", category: "ai", envKeys: ["HEYGEN_API_KEY"], creditBased: true, quotaTypes: ["render_minutes"], rotationDays: 90, loginUrl: "https://app.heygen.com", docsUrl: "https://docs.heygen.com" },
  { id: "gemini", name: "Google Gemini (images)", category: "ai", envKeys: ["GEMINI_API_KEY"], creditBased: true, quotaTypes: ["requests"], rotationDays: 90, loginUrl: "https://aistudio.google.com", docsUrl: "https://ai.google.dev" },

  // ---- SEO & crawling ----
  { id: "firecrawl", name: "Firecrawl", category: "seo", envKeys: ["FIRECRAWL_API_KEY"], creditBased: true, quotaTypes: ["pages_crawled"], rotationDays: 90, loginUrl: "https://www.firecrawl.dev/app", docsUrl: "https://docs.firecrawl.dev" },
  { id: "google-search-console", name: "Google Search Console API", category: "seo", envKeys: [], quotaTypes: ["requests"], loginUrl: "https://search.google.com/search-console", docsUrl: "https://developers.google.com/webmaster-tools" },
  { id: "pagespeed", name: "PageSpeed Insights API", category: "seo", envKeys: ["PAGESPEED_API_KEY"], quotaTypes: ["requests"], loginUrl: "https://console.cloud.google.com", docsUrl: "https://developers.google.com/speed/docs/insights/v5/get-started" },

  // ---- Lead generation ----
  { id: "zerobounce", name: "ZeroBounce (email verification)", category: "leads", envKeys: ["ZEROBOUNCE_API_KEY"], creditBased: true, quotaTypes: ["emails_verified"], rotationDays: 90, loginUrl: "https://www.zerobounce.net/members", docsUrl: "https://www.zerobounce.net/docs" },
  { id: "neverbounce", name: "NeverBounce (email verification)", category: "leads", envKeys: ["NEVERBOUNCE_API_KEY"], creditBased: true, quotaTypes: ["emails_verified"], rotationDays: 90, loginUrl: "https://app.neverbounce.com", docsUrl: "https://developers.neverbounce.com" },

  // ---- Payments ----
  { id: "paddle", name: "Paddle (card payments)", category: "payments", envKeys: ["PADDLE_WEBHOOK_SECRET", "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"], hasWebhook: true, webhookPath: "/api/webhooks/paddle", rotationDays: 180, loginUrl: "https://vendors.paddle.com", docsUrl: "https://developer.paddle.com" },
  { id: "nowpayments", name: "NOWPayments (crypto)", category: "payments", envKeys: ["NOWPAYMENTS_API_KEY"], hasWebhook: true, webhookPath: "/api/webhooks/crypto", rotationDays: 180, loginUrl: "https://account.nowpayments.io", docsUrl: "https://documenter.getpostman.com/view/7907941/S1a32n38" },

  // ---- Storage & database ----
  { id: "supabase-storage", name: "Supabase Storage", category: "storage", envKeys: ["NEXT_PUBLIC_SUPABASE_URL"], quotaTypes: ["storage_gb"], loginUrl: "https://supabase.com/dashboard", docsUrl: "https://supabase.com/docs/guides/storage" },
  { id: "cloudflare-r2", name: "Cloudflare R2", category: "storage", envKeys: ["R2_ACCESS_KEY_ID"], quotaTypes: ["storage_gb"], loginUrl: "https://dash.cloudflare.com", docsUrl: "https://developers.cloudflare.com/r2" },
  { id: "supabase-db", name: "Supabase PostgreSQL", category: "database", envKeys: ["SUPABASE_SERVICE_ROLE_KEY"], quotaTypes: ["storage_gb"], rotationDays: 180, loginUrl: "https://supabase.com/dashboard", docsUrl: "https://supabase.com/docs" },

  // ---- Email ----
  { id: "brevo", name: "Brevo (transactional email)", category: "email", envKeys: ["BREVO_API_KEY"], creditBased: true, quotaTypes: ["emails"], hasWebhook: true, webhookPath: "/api/webhooks/brevo", rotationDays: 90, loginUrl: "https://app.brevo.com", docsUrl: "https://developers.brevo.com" },
  { id: "brevo-campaigns", name: "Brevo (campaign email)", category: "email", envKeys: ["BREVO_API_KEY"], creditBased: true, quotaTypes: ["emails"], loginUrl: "https://app.brevo.com", docsUrl: "https://developers.brevo.com" },
  { id: "resend", name: "Resend (auth email SMTP)", category: "email", envKeys: [], quotaTypes: ["emails"], rotationDays: 180, loginUrl: "https://resend.com", docsUrl: "https://resend.com/docs" },

  // ---- Publishing ----
  { id: "wordpress", name: "WordPress publishing", category: "publishing", envKeys: [], hasWebhook: false, docsUrl: "https://developer.wordpress.org/rest-api/" },
  { id: "youtube", name: "YouTube", category: "publishing", envKeys: ["YOUTUBE_CLIENT_ID"], quotaTypes: ["requests"], loginUrl: "https://console.cloud.google.com", docsUrl: "https://developers.google.com/youtube/v3" },
  { id: "tiktok", name: "TikTok", category: "publishing", envKeys: ["TIKTOK_CLIENT_ID"], loginUrl: "https://developers.tiktok.com", docsUrl: "https://developers.tiktok.com/doc" },
  { id: "instagram", name: "Instagram", category: "publishing", envKeys: ["INSTAGRAM_CLIENT_ID"], loginUrl: "https://developers.facebook.com", docsUrl: "https://developers.facebook.com/docs/instagram-api" },
  { id: "facebook", name: "Facebook", category: "publishing", envKeys: ["FACEBOOK_CLIENT_ID"], loginUrl: "https://developers.facebook.com", docsUrl: "https://developers.facebook.com/docs" },
  { id: "linkedin", name: "LinkedIn", category: "publishing", envKeys: ["LINKEDIN_CLIENT_ID"], loginUrl: "https://developer.linkedin.com", docsUrl: "https://learn.microsoft.com/linkedin" },
  { id: "x-twitter", name: "X / Twitter", category: "publishing", envKeys: ["X_CLIENT_ID"], loginUrl: "https://developer.x.com", docsUrl: "https://developer.x.com/en/docs" },
  { id: "pinterest", name: "Pinterest", category: "publishing", envKeys: ["PINTEREST_CLIENT_ID"], loginUrl: "https://developers.pinterest.com", docsUrl: "https://developers.pinterest.com/docs" },

  // ---- Infrastructure ----
  { id: "vercel", name: "Vercel (hosting)", category: "infrastructure", envKeys: ["VERCEL"], loginUrl: "https://vercel.com/dashboard", docsUrl: "https://vercel.com/docs" },
  { id: "cloudflare", name: "Cloudflare (DNS + domain)", category: "infrastructure", envKeys: [], loginUrl: "https://dash.cloudflare.com", docsUrl: "https://developers.cloudflare.com" },
  { id: "sentry", name: "Sentry (error monitoring)", category: "infrastructure", envKeys: ["SENTRY_DSN"], quotaTypes: ["requests"], loginUrl: "https://sentry.io", docsUrl: "https://docs.sentry.io" },
  { id: "upstash", name: "Upstash Redis (rate limiting)", category: "infrastructure", envKeys: ["UPSTASH_REDIS_REST_URL"], quotaTypes: ["requests"], rotationDays: 180, loginUrl: "https://console.upstash.com", docsUrl: "https://upstash.com/docs" },
  { id: "github", name: "GitHub (source + PAT)", category: "infrastructure", envKeys: [], rotationDays: 90, loginUrl: "https://github.com", docsUrl: "https://docs.github.com" },
];

export const OPS_CATEGORIES: { id: OpsCategory; label: string }[] = [
  { id: "ai", label: "AI Providers" },
  { id: "seo", label: "SEO & Crawling" },
  { id: "leads", label: "Lead Generation" },
  { id: "payments", label: "Payments" },
  { id: "storage", label: "Storage" },
  { id: "database", label: "Database" },
  { id: "email", label: "Email" },
  { id: "publishing", label: "Publishing" },
  { id: "infrastructure", label: "Infrastructure" },
];

export const getOpsProvider = (id: string): OpsProviderDef | undefined =>
  OPS_PROVIDERS.find((p) => p.id === id);

/** SERVER-ONLY use: whether any of a provider's env keys is set. */
export function isOpsProviderConfigured(def: OpsProviderDef): boolean {
  if (def.envKeys.length === 0) return true; // external/manual services count as present
  return def.envKeys.some((k) => !!process.env[k]);
}

/** Default monthly review checklist (seeded on the 1st of each month). */
export const MONTHLY_CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "subscriptions", label: "Review all provider subscriptions and renewal dates" },
  { key: "credits", label: "Check credit balances on every credit-based provider" },
  { key: "key-rotation", label: "Check API key rotation status" },
  { key: "database", label: "Review database size, connections, and backup status" },
  { key: "storage", label: "Review file storage usage and growth" },
  { key: "webhooks", label: "Review webhook failures" },
  { key: "payments", label: "Review failed payments and payment-provider health" },
  { key: "support", label: "Review open user support tickets" },
  { key: "email-health", label: "Review email sending health and deliverability" },
  { key: "errors", label: "Review platform errors (Sentry)" },
  { key: "cost-forecast", label: "Review the monthly cost forecast" },
  { key: "backups", label: "Confirm database backup status (Supabase Pro)" },
  { key: "security-logs", label: "Review security and audit logs" },
];
