/**
 * Unified Publishing & Promotion capability matrix — the single source of truth
 * for what each content type can do (publish / promote / export / schedule).
 *
 * The spec calls for a `publishing_destinations` table; in practice a typed
 * config is safer and faster than a DB lookup for static capability data, and it
 * keeps publishing logic OUT of individual studio pages. Pages/components read
 * from here via getCapability() — they never hardcode destination lists.
 *
 * Slugs are aligned with existing systems:
 *  - publish destination brand icons  -> components/icons/BrandIcon.tsx (BRAND_KEYS)
 *  - ad platforms                      -> lib/constants.ts AD_PLATFORMS
 *  - export via                        -> lib/books/export.ts, lib/design/render.ts, seo/publish.ts
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type AccountType = "social" | "advertising" | "website" | "email";

export type PublishDestinationId =
  | "youtube"
  | "youtube_shorts"
  | "tiktok"
  | "instagram"
  | "instagram_reels"
  | "facebook"
  | "facebook_reels"
  | "linkedin"
  | "x"
  | "pinterest"
  | "wordpress"
  | "woocommerce"
  | "shopify"
  | "webflow"
  | "custom_webhook"
  | "brevo"
  | "mailchimp";

export type AdPlatformId =
  | "meta"
  | "google_ads"
  | "youtube_ads"
  | "tiktok_ads"
  | "linkedin_ads"
  | "pinterest_ads";

export type ExportFormatId =
  | "pdf"
  | "docx"
  | "epub"
  | "markdown"
  | "html"
  | "txt"
  | "mp4"
  | "mov"
  | "png"
  | "jpg"
  | "gif"
  | "zip"
  | "json";

export type ScheduleOptionId = "now" | "scheduled" | "optimal_time" | "recurring" | "draft";

export type MetadataFieldId =
  | "title"
  | "description"
  | "caption"
  | "hashtags"
  | "thumbnail"
  | "playlist"
  | "visibility"
  | "publish_date"
  | "publish_time"
  | "timezone"
  | "first_comment"
  | "slug"
  | "excerpt"
  | "category"
  | "tags"
  | "author"
  | "featured_image"
  | "cover"
  | "cta"
  | "subject"
  | "preheader";

export type AutomationActionId =
  | "add_to_campaign"
  | "add_to_calendar"
  | "autopilot_publish"
  | "add_to_automation_studio"
  | "newsletter_summary"
  | "cross_post"
  | "run_seo_audit";

export type ContentTypeId =
  | "ai_video"
  | "ai_short"
  | "long_form_video"
  | "social_video"
  | "book"
  | "ebook"
  | "blog_article"
  | "seo_article"
  | "image"
  | "design"
  | "advertisement"
  | "landing_page"
  | "email_campaign"
  | "podcast"
  | "business_document"
  | "real_estate"
  | "website"
  | "app";

/** Primary/secondary completion-panel action ids (see ContentCompletionPanel). */
export type CompletionActionId =
  | "preview"
  | "download"
  | "publish"
  | "schedule"
  | "promote"
  | "save_draft"
  | "duplicate"
  | "edit_again"
  | "create_variation"
  | "add_to_campaign"
  | "share_team"
  | "view_analytics";

// ---------------------------------------------------------------------------
// Capability shape
// ---------------------------------------------------------------------------

export interface CreditEstimate {
  /** AI platform-specific metadata (title/desc/hashtags) optimization. */
  optimize?: number;
  thumbnail?: number;
  adCreative?: number;
  promoVideo?: number;
  campaignPackage?: number;
  /** Adapting one asset for one extra platform. */
  platformAdapt?: number;
}

export interface ContentCapability {
  id: ContentTypeId;
  label: string;
  /** Studio this content type belongs to (matches dashboard nav). */
  studio: "video" | "design" | "books" | "seo" | "ads" | "email" | "build" | "realestate" | "business";
  publishDestinations: PublishDestinationId[];
  adPlatforms: AdPlatformId[];
  exportFormats: ExportFormatId[];
  scheduleOptions: ScheduleOptionId[];
  metadataFields: MetadataFieldId[];
  automationActions: AutomationActionId[];
  requiredAccountTypes: AccountType[];
  creditEstimate: CreditEstimate;
  primaryActions: CompletionActionId[];
  secondaryActions: CompletionActionId[];
}

// ---------------------------------------------------------------------------
// Destination + ad-platform registries (labels, icons, live status, permissions)
// ---------------------------------------------------------------------------

export interface DestinationMeta {
  id: PublishDestinationId;
  label: string;
  /** BrandIcon slug (or null → PlatformIcon emoji fallback). */
  brandIcon: string | null;
  accountType: AccountType;
  /** true = live auto-publish wired; false = connect + export/draft package only. */
  live: boolean;
  permissions: string;
  docsUrl?: string;
}

export const PUBLISH_DESTINATIONS: Record<PublishDestinationId, DestinationMeta> = {
  youtube: { id: "youtube", label: "YouTube", brandIcon: "youtube", accountType: "social", live: true, permissions: "Upload & manage your videos" },
  youtube_shorts: { id: "youtube_shorts", label: "YouTube Shorts", brandIcon: "youtube", accountType: "social", live: true, permissions: "Upload short-form videos" },
  tiktok: { id: "tiktok", label: "TikTok", brandIcon: "tiktok", accountType: "social", live: false, permissions: "Post videos to your account" },
  instagram: { id: "instagram", label: "Instagram", brandIcon: "instagram", accountType: "social", live: false, permissions: "Publish posts to your Business account" },
  instagram_reels: { id: "instagram_reels", label: "Instagram Reels", brandIcon: "instagram", accountType: "social", live: false, permissions: "Publish Reels to your Business account" },
  facebook: { id: "facebook", label: "Facebook Page", brandIcon: "facebook", accountType: "social", live: true, permissions: "Publish posts to your Page" },
  facebook_reels: { id: "facebook_reels", label: "Facebook Reels", brandIcon: "facebook", accountType: "social", live: false, permissions: "Publish Reels to your Page" },
  linkedin: { id: "linkedin", label: "LinkedIn", brandIcon: "linkedin", accountType: "social", live: false, permissions: "Share posts on your profile or Page" },
  x: { id: "x", label: "X", brandIcon: "x", accountType: "social", live: false, permissions: "Post to your account" },
  pinterest: { id: "pinterest", label: "Pinterest", brandIcon: "pinterest", accountType: "social", live: false, permissions: "Create pins on your boards" },
  wordpress: { id: "wordpress", label: "WordPress", brandIcon: "wordpress", accountType: "website", live: true, permissions: "Create & schedule posts via Application Password" },
  woocommerce: { id: "woocommerce", label: "WooCommerce", brandIcon: "wordpress", accountType: "website", live: true, permissions: "Publish product/blog content via REST" },
  shopify: { id: "shopify", label: "Shopify", brandIcon: null, accountType: "website", live: false, permissions: "Create blog articles & pages" },
  webflow: { id: "webflow", label: "Webflow", brandIcon: null, accountType: "website", live: false, permissions: "Publish CMS items (coming soon)" },
  custom_webhook: { id: "custom_webhook", label: "Custom Webhook", brandIcon: null, accountType: "website", live: true, permissions: "POST content JSON to your endpoint" },
  brevo: { id: "brevo", label: "Brevo", brandIcon: "brevo", accountType: "email", live: false, permissions: "Prepare a ready-to-send campaign (hand off to Email Studio)" },
  mailchimp: { id: "mailchimp", label: "Mailchimp", brandIcon: null, accountType: "email", live: false, permissions: "Create email campaigns (coming soon)" },
};

export interface AdPlatformMeta {
  id: AdPlatformId;
  label: string;
  brandIcon: string | null;
  live: boolean;
  permissions: string;
}

export const AD_PLATFORM_DESTINATIONS: Record<AdPlatformId, AdPlatformMeta> = {
  meta: { id: "meta", label: "Meta Ads", brandIcon: "facebook", live: false, permissions: "Create campaigns on Facebook & Instagram" },
  google_ads: { id: "google_ads", label: "Google Ads", brandIcon: "google", live: false, permissions: "Create Search & Display campaigns" },
  youtube_ads: { id: "youtube_ads", label: "YouTube Ads", brandIcon: "youtube", live: false, permissions: "Create video campaigns" },
  tiktok_ads: { id: "tiktok_ads", label: "TikTok Ads", brandIcon: "tiktok", live: false, permissions: "Create video ad campaigns" },
  linkedin_ads: { id: "linkedin_ads", label: "LinkedIn Ads", brandIcon: "linkedin", live: false, permissions: "Create sponsored content campaigns" },
  pinterest_ads: { id: "pinterest_ads", label: "Pinterest Ads", brandIcon: "pinterest", live: false, permissions: "Create pin campaigns" },
};

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

const VIDEO_SOCIALS: PublishDestinationId[] = ["youtube", "tiktok", "instagram_reels", "facebook_reels", "linkedin", "x", "pinterest"];
const SHORT_SOCIALS: PublishDestinationId[] = ["youtube_shorts", "tiktok", "instagram_reels", "facebook_reels"];
const IMAGE_SOCIALS: PublishDestinationId[] = ["instagram", "facebook", "linkedin", "pinterest", "x"];
const ALL_AD_PLATFORMS: AdPlatformId[] = ["meta", "google_ads", "youtube_ads", "tiktok_ads", "linkedin_ads", "pinterest_ads"];
const VIDEO_META: MetadataFieldId[] = ["title", "description", "caption", "hashtags", "thumbnail", "playlist", "visibility", "publish_date", "publish_time", "timezone", "first_comment", "cta"];
const SCHED_FULL: ScheduleOptionId[] = ["now", "scheduled", "optimal_time", "draft"];
const AUTO_FULL: AutomationActionId[] = ["add_to_campaign", "add_to_calendar", "autopilot_publish", "add_to_automation_studio", "cross_post"];

const PRIMARY_FULL: CompletionActionId[] = ["preview", "download", "publish", "schedule", "promote", "save_draft"];
const SECONDARY_FULL: CompletionActionId[] = ["duplicate", "edit_again", "create_variation", "add_to_campaign", "share_team", "view_analytics"];

// ---------------------------------------------------------------------------
// The matrix
// ---------------------------------------------------------------------------

export const PUBLISHING_CAPABILITIES: Record<ContentTypeId, ContentCapability> = {
  ai_video: {
    id: "ai_video", label: "AI Video", studio: "video",
    publishDestinations: VIDEO_SOCIALS, adPlatforms: ALL_AD_PLATFORMS,
    exportFormats: ["mp4", "mov"], scheduleOptions: SCHED_FULL,
    metadataFields: VIDEO_META, automationActions: AUTO_FULL,
    requiredAccountTypes: ["social", "advertising"],
    creditEstimate: { optimize: 2, thumbnail: 4, adCreative: 5, promoVideo: 30, campaignPackage: 8, platformAdapt: 2 },
    primaryActions: PRIMARY_FULL, secondaryActions: SECONDARY_FULL,
  },
  ai_short: {
    id: "ai_short", label: "AI Short", studio: "video",
    publishDestinations: SHORT_SOCIALS, adPlatforms: ["meta", "tiktok_ads", "youtube_ads"],
    exportFormats: ["mp4"], scheduleOptions: SCHED_FULL,
    metadataFields: ["title", "caption", "hashtags", "thumbnail", "visibility", "publish_date", "publish_time", "timezone", "first_comment", "cta"],
    automationActions: AUTO_FULL, requiredAccountTypes: ["social", "advertising"],
    creditEstimate: { optimize: 2, thumbnail: 4, adCreative: 5, platformAdapt: 2 },
    primaryActions: PRIMARY_FULL, secondaryActions: SECONDARY_FULL,
  },
  long_form_video: {
    id: "long_form_video", label: "Long-form Video", studio: "video",
    publishDestinations: ["youtube", "facebook", "linkedin"], adPlatforms: ["meta", "google_ads", "youtube_ads", "linkedin_ads"],
    exportFormats: ["mp4", "mov"], scheduleOptions: SCHED_FULL,
    metadataFields: VIDEO_META, automationActions: AUTO_FULL,
    requiredAccountTypes: ["social", "advertising"],
    creditEstimate: { optimize: 2, thumbnail: 4, adCreative: 5, promoVideo: 30, campaignPackage: 8, platformAdapt: 2 },
    primaryActions: PRIMARY_FULL, secondaryActions: SECONDARY_FULL,
  },
  social_video: {
    id: "social_video", label: "Social Video", studio: "video",
    publishDestinations: VIDEO_SOCIALS, adPlatforms: ["meta", "tiktok_ads", "pinterest_ads"],
    exportFormats: ["mp4"], scheduleOptions: SCHED_FULL,
    metadataFields: ["title", "caption", "hashtags", "thumbnail", "visibility", "publish_date", "publish_time", "timezone", "first_comment", "cta"],
    automationActions: AUTO_FULL, requiredAccountTypes: ["social", "advertising"],
    creditEstimate: { optimize: 2, thumbnail: 4, adCreative: 5, platformAdapt: 2 },
    primaryActions: PRIMARY_FULL, secondaryActions: SECONDARY_FULL,
  },
  book: {
    id: "book", label: "Book", studio: "books",
    publishDestinations: ["facebook", "instagram", "linkedin", "x", "pinterest", "wordpress", "brevo"],
    adPlatforms: ["meta", "google_ads", "youtube_ads"],
    exportFormats: ["pdf", "docx", "epub", "markdown", "html"], scheduleOptions: ["now", "scheduled", "draft"],
    metadataFields: ["title", "description", "cover", "caption", "hashtags", "cta"],
    automationActions: ["add_to_campaign", "add_to_calendar", "newsletter_summary"],
    requiredAccountTypes: ["social", "advertising", "email"],
    creditEstimate: { optimize: 3, adCreative: 5, promoVideo: 30, campaignPackage: 10 },
    primaryActions: ["preview", "download", "promote", "save_draft"],
    secondaryActions: ["duplicate", "edit_again", "add_to_campaign", "share_team", "view_analytics"],
  },
  ebook: {
    id: "ebook", label: "Ebook", studio: "books",
    publishDestinations: ["facebook", "instagram", "linkedin", "x", "pinterest", "wordpress", "brevo"],
    adPlatforms: ["meta", "google_ads"],
    exportFormats: ["pdf", "epub", "markdown", "html"], scheduleOptions: ["now", "scheduled", "draft"],
    metadataFields: ["title", "description", "cover", "caption", "hashtags", "cta"],
    automationActions: ["add_to_campaign", "add_to_calendar", "newsletter_summary"],
    requiredAccountTypes: ["social", "advertising", "email"],
    creditEstimate: { optimize: 3, adCreative: 5, campaignPackage: 10 },
    primaryActions: ["preview", "download", "promote", "save_draft"],
    secondaryActions: ["duplicate", "edit_again", "add_to_campaign", "share_team", "view_analytics"],
  },
  blog_article: {
    id: "blog_article", label: "Blog Article", studio: "seo",
    publishDestinations: ["wordpress", "woocommerce", "shopify", "webflow", "custom_webhook", "brevo"],
    adPlatforms: ["meta", "google_ads"],
    exportFormats: ["html", "markdown", "pdf"], scheduleOptions: ["now", "scheduled", "draft"],
    metadataFields: ["title", "slug", "excerpt", "category", "tags", "author", "featured_image", "description"],
    automationActions: ["add_to_calendar", "add_to_campaign", "newsletter_summary", "cross_post"],
    requiredAccountTypes: ["website", "advertising", "email"],
    creditEstimate: { optimize: 2, adCreative: 5, campaignPackage: 6 },
    primaryActions: ["preview", "publish", "schedule", "promote", "save_draft"],
    secondaryActions: ["duplicate", "edit_again", "add_to_campaign", "share_team", "view_analytics"],
  },
  seo_article: {
    id: "seo_article", label: "SEO Article", studio: "seo",
    publishDestinations: ["wordpress", "woocommerce", "shopify", "webflow", "custom_webhook", "brevo"],
    adPlatforms: ["meta", "google_ads"],
    exportFormats: ["html", "markdown", "pdf"], scheduleOptions: ["now", "scheduled", "draft"],
    metadataFields: ["title", "slug", "excerpt", "category", "tags", "author", "featured_image", "description"],
    automationActions: ["add_to_calendar", "add_to_campaign", "newsletter_summary", "cross_post", "run_seo_audit"],
    requiredAccountTypes: ["website", "advertising", "email"],
    creditEstimate: { optimize: 2, adCreative: 5, campaignPackage: 6 },
    primaryActions: ["preview", "publish", "schedule", "promote", "save_draft"],
    secondaryActions: ["duplicate", "edit_again", "add_to_campaign", "share_team", "view_analytics"],
  },
  image: {
    id: "image", label: "Image", studio: "design",
    publishDestinations: IMAGE_SOCIALS, adPlatforms: ["meta", "pinterest_ads", "google_ads"],
    exportFormats: ["png", "jpg"], scheduleOptions: SCHED_FULL,
    metadataFields: ["caption", "hashtags", "visibility", "publish_date", "publish_time", "timezone", "first_comment"],
    automationActions: AUTO_FULL, requiredAccountTypes: ["social", "advertising"],
    creditEstimate: { optimize: 2, adCreative: 5, platformAdapt: 2 },
    primaryActions: PRIMARY_FULL, secondaryActions: SECONDARY_FULL,
  },
  design: {
    id: "design", label: "Design", studio: "design",
    publishDestinations: IMAGE_SOCIALS, adPlatforms: ALL_AD_PLATFORMS,
    exportFormats: ["png", "jpg", "pdf", "mp4", "gif"], scheduleOptions: SCHED_FULL,
    metadataFields: ["caption", "hashtags", "visibility", "publish_date", "publish_time", "timezone", "first_comment", "cta"],
    automationActions: AUTO_FULL, requiredAccountTypes: ["social", "advertising"],
    creditEstimate: { optimize: 2, adCreative: 5, platformAdapt: 2 },
    primaryActions: PRIMARY_FULL, secondaryActions: SECONDARY_FULL,
  },
  advertisement: {
    id: "advertisement", label: "Advertisement", studio: "ads",
    publishDestinations: [], adPlatforms: ALL_AD_PLATFORMS,
    exportFormats: ["png", "jpg", "mp4", "zip", "json"], scheduleOptions: ["now", "scheduled", "draft"],
    metadataFields: ["title", "description", "cta"],
    automationActions: ["add_to_campaign", "add_to_automation_studio"],
    requiredAccountTypes: ["advertising"],
    creditEstimate: { adCreative: 5, campaignPackage: 8, platformAdapt: 2 },
    primaryActions: ["preview", "download", "promote", "save_draft"],
    secondaryActions: ["duplicate", "edit_again", "create_variation", "view_analytics"],
  },
  landing_page: {
    id: "landing_page", label: "Landing Page", studio: "build",
    publishDestinations: ["wordpress", "custom_webhook", "webflow"], adPlatforms: ALL_AD_PLATFORMS,
    exportFormats: ["html", "zip"], scheduleOptions: ["now", "draft"],
    metadataFields: ["title", "slug", "description", "cta"],
    automationActions: ["add_to_campaign", "add_to_automation_studio", "run_seo_audit"],
    requiredAccountTypes: ["website", "advertising"],
    creditEstimate: { optimize: 2, adCreative: 5, campaignPackage: 8 },
    primaryActions: ["preview", "download", "publish", "promote", "save_draft"],
    secondaryActions: ["duplicate", "edit_again", "create_variation", "add_to_campaign", "view_analytics"],
  },
  email_campaign: {
    id: "email_campaign", label: "Email Campaign", studio: "email",
    publishDestinations: ["brevo", "mailchimp"], adPlatforms: [],
    exportFormats: ["html"], scheduleOptions: ["now", "scheduled", "draft"],
    metadataFields: ["subject", "preheader", "publish_date", "publish_time", "timezone"],
    automationActions: ["add_to_calendar", "add_to_automation_studio"],
    requiredAccountTypes: ["email"],
    creditEstimate: { optimize: 2 },
    primaryActions: ["preview", "publish", "schedule", "save_draft"],
    secondaryActions: ["duplicate", "edit_again", "view_analytics"],
  },
  podcast: {
    id: "podcast", label: "Podcast", studio: "video",
    publishDestinations: ["youtube", "x", "linkedin", "facebook"], adPlatforms: ["meta", "google_ads"],
    exportFormats: ["mp4", "mov"], scheduleOptions: SCHED_FULL,
    metadataFields: ["title", "description", "caption", "hashtags", "thumbnail", "visibility", "publish_date", "publish_time", "timezone"],
    automationActions: AUTO_FULL, requiredAccountTypes: ["social", "advertising"],
    creditEstimate: { optimize: 2, thumbnail: 4, adCreative: 5 },
    primaryActions: PRIMARY_FULL, secondaryActions: SECONDARY_FULL,
  },
  business_document: {
    id: "business_document", label: "Business Document", studio: "business",
    publishDestinations: ["linkedin", "wordpress", "brevo"], adPlatforms: [],
    exportFormats: ["pdf", "docx", "html", "markdown"], scheduleOptions: ["now", "scheduled", "draft"],
    metadataFields: ["title", "description"],
    automationActions: ["add_to_calendar"],
    requiredAccountTypes: ["website", "email"],
    creditEstimate: { optimize: 2 },
    primaryActions: ["preview", "download", "save_draft"],
    secondaryActions: ["duplicate", "edit_again", "share_team"],
  },
  real_estate: {
    id: "real_estate", label: "Real Estate Material", studio: "realestate",
    publishDestinations: IMAGE_SOCIALS, adPlatforms: ["meta", "google_ads", "pinterest_ads"],
    exportFormats: ["png", "jpg", "pdf", "mp4"], scheduleOptions: SCHED_FULL,
    metadataFields: ["title", "caption", "hashtags", "visibility", "publish_date", "publish_time", "timezone", "cta"],
    automationActions: AUTO_FULL, requiredAccountTypes: ["social", "advertising"],
    creditEstimate: { optimize: 2, adCreative: 5, campaignPackage: 8, platformAdapt: 2 },
    primaryActions: PRIMARY_FULL, secondaryActions: SECONDARY_FULL,
  },
  website: {
    id: "website", label: "Website Project", studio: "build",
    publishDestinations: ["custom_webhook"], adPlatforms: ALL_AD_PLATFORMS,
    exportFormats: ["zip", "html", "json"], scheduleOptions: ["now", "draft"],
    metadataFields: ["title", "description"],
    automationActions: ["add_to_campaign", "add_to_automation_studio", "run_seo_audit"],
    requiredAccountTypes: ["advertising", "website"],
    creditEstimate: { optimize: 2, adCreative: 5, promoVideo: 30, campaignPackage: 10 },
    primaryActions: ["preview", "download", "promote", "save_draft"],
    secondaryActions: ["duplicate", "edit_again", "add_to_campaign", "view_analytics"],
  },
  app: {
    id: "app", label: "App Project", studio: "build",
    publishDestinations: ["custom_webhook"], adPlatforms: ALL_AD_PLATFORMS,
    exportFormats: ["zip", "json"], scheduleOptions: ["now", "draft"],
    metadataFields: ["title", "description"],
    automationActions: ["add_to_campaign", "add_to_automation_studio"],
    requiredAccountTypes: ["advertising"],
    creditEstimate: { optimize: 2, adCreative: 5, promoVideo: 30, campaignPackage: 10 },
    primaryActions: ["preview", "download", "promote", "save_draft"],
    secondaryActions: ["duplicate", "edit_again", "add_to_campaign", "view_analytics"],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getCapability(id: ContentTypeId): ContentCapability | null {
  return PUBLISHING_CAPABILITIES[id] ?? null;
}

export function destinationMeta(id: PublishDestinationId): DestinationMeta | null {
  return PUBLISH_DESTINATIONS[id] ?? null;
}

export function adPlatformMeta(id: AdPlatformId): AdPlatformMeta | null {
  return AD_PLATFORM_DESTINATIONS[id] ?? null;
}

/** Account types a content type needs, mapped from its destinations + ad platforms. */
export function requiredAccountTypesFor(id: ContentTypeId): AccountType[] {
  const cap = getCapability(id);
  return cap ? cap.requiredAccountTypes : [];
}

/** All destinations grouped by account type — for the Connect Account modal. */
export function destinationsByAccountType(): Record<AccountType, DestinationMeta[]> {
  const out: Record<AccountType, DestinationMeta[]> = { social: [], advertising: [], website: [], email: [] };
  for (const d of Object.values(PUBLISH_DESTINATIONS)) out[d.accountType].push(d);
  // advertising accounts come from the ad-platform registry
  return out;
}

/** Whether live auto-publish is wired for a destination (vs export/draft only). */
export function isDestinationLive(id: PublishDestinationId): boolean {
  return PUBLISH_DESTINATIONS[id]?.live ?? false;
}

export function isAdPlatformLive(id: AdPlatformId): boolean {
  return AD_PLATFORM_DESTINATIONS[id]?.live ?? false;
}

export const ALL_CONTENT_TYPES = Object.keys(PUBLISHING_CAPABILITIES) as ContentTypeId[];
