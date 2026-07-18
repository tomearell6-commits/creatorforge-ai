/**
 * Social Business Studio — provider capability registry. Single source of truth
 * for what each platform's official API supports. The UI reads this to disable
 * unsupported actions and label features Supported / Limited / Manual / N-A.
 *
 * `live` = CreatorsForge has a working live adapter for it TODAY. Almost all
 * social platforms require an app + platform review before live posting/reading
 * works, so most capabilities are "manual" (prepare + export, never simulated)
 * until the provider's app is approved.
 */

export type CapabilityLevel = "supported" | "limited" | "manual" | "not_available";

export type SocialProviderId =
  | "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube" | "youtube_shorts"
  | "pinterest" | "x" | "threads" | "google_business" | "wordpress" | "brevo";

export interface SocialProvider {
  id: SocialProviderId;
  name: string;
  brandIcon: string | null;           // BrandIcon slug
  accountTypes: string[];
  oauthSupported: boolean;
  /** capability → level */
  content: CapabilityLevel;
  publishing: CapabilityLevel;
  scheduling: CapabilityLevel;
  analytics: CapabilityLevel;
  inbox: CapabilityLevel;
  comments: CapabilityLevel;
  ads: CapabilityLevel;
  profileEditing: CapabilityLevel;
  tokenRefresh: boolean;
  /** true when a live CreatorsForge adapter exists right now. */
  live: boolean;
  requiredPermissions: string[];
  knownLimits: string;
}

const M: CapabilityLevel = "manual";
const NA: CapabilityLevel = "not_available";
const LIM: CapabilityLevel = "limited";
const SUP: CapabilityLevel = "supported";

export const SOCIAL_PROVIDERS: Record<SocialProviderId, SocialProvider> = {
  facebook: {
    id: "facebook", name: "Facebook Page", brandIcon: "facebook", accountTypes: ["page"],
    oauthSupported: true, content: SUP, publishing: SUP, scheduling: M, analytics: M, inbox: M, comments: M, ads: M, profileEditing: M,
    tokenRefresh: true, live: true, requiredPermissions: ["pages_manage_posts", "pages_read_engagement"],
    knownLimits: "Page posting is live. Insights/inbox still need a reviewed Meta app + business verification.",
  },
  instagram: {
    id: "instagram", name: "Instagram Business", brandIcon: "instagram", accountTypes: ["business"],
    oauthSupported: true, content: SUP, publishing: SUP, scheduling: M, analytics: M, inbox: M, comments: M, ads: M, profileEditing: LIM,
    tokenRefresh: true, live: true, requiredPermissions: ["instagram_content_publish", "instagram_basic"],
    knownLimits: "Feed/Reels posting is live (needs a linked Facebook Page). Stories via API are limited.",
  },
  linkedin: {
    id: "linkedin", name: "LinkedIn Company Page", brandIcon: "linkedin", accountTypes: ["company", "profile"],
    oauthSupported: true, content: SUP, publishing: SUP, scheduling: M, analytics: M, inbox: NA, comments: LIM, ads: M, profileEditing: LIM,
    tokenRefresh: true, live: true, requiredPermissions: ["w_member_social", "openid", "profile"],
    knownLimits: "Member (personal profile) posting is live. Company Page posting needs w_organization_social approval. No inbox API.",
  },
  tiktok: {
    id: "tiktok", name: "TikTok Business", brandIcon: "tiktok", accountTypes: ["business"],
    oauthSupported: true, content: SUP, publishing: SUP, scheduling: M, analytics: LIM, inbox: NA, comments: NA, ads: M, profileEditing: NA,
    tokenRefresh: true, live: true, requiredPermissions: ["video.publish", "user.info.basic"],
    knownLimits: "Video posting is live. Unaudited apps can only post to private accounts until approved. No official trend-data API — trend tools are planning aids only.",
  },
  youtube: {
    id: "youtube", name: "YouTube", brandIcon: "youtube", accountTypes: ["channel"],
    oauthSupported: true, content: SUP, publishing: SUP, scheduling: M, analytics: M, inbox: NA, comments: LIM, ads: M, profileEditing: LIM,
    tokenRefresh: true, live: true, requiredPermissions: ["youtube.upload", "youtube.readonly"],
    knownLimits: "Live upload of rendered videos works (videos.insert). Public use for other channels needs Google verification. Community posts API is limited.",
  },
  youtube_shorts: {
    id: "youtube_shorts", name: "YouTube Shorts", brandIcon: "youtube", accountTypes: ["channel"],
    oauthSupported: true, content: SUP, publishing: SUP, scheduling: M, analytics: M, inbox: NA, comments: NA, ads: M, profileEditing: NA,
    tokenRefresh: true, live: true, requiredPermissions: ["youtube.upload"],
    knownLimits: "Uploaded as a short video via the YouTube Data API. Public use for other channels needs Google verification.",
  },
  pinterest: {
    id: "pinterest", name: "Pinterest Business", brandIcon: "pinterest", accountTypes: ["business"],
    oauthSupported: true, content: SUP, publishing: M, scheduling: M, analytics: M, inbox: NA, comments: NA, ads: M, profileEditing: LIM,
    tokenRefresh: true, live: false, requiredPermissions: ["boards:write", "pins:write", "pins:read"],
    knownLimits: "Pin creation needs an approved Pinterest app.",
  },
  x: {
    id: "x", name: "X", brandIcon: "x", accountTypes: ["profile"],
    oauthSupported: true, content: SUP, publishing: M, scheduling: M, analytics: LIM, inbox: NA, comments: LIM, ads: M, profileEditing: NA,
    tokenRefresh: true, live: false, requiredPermissions: ["tweet.write", "tweet.read", "users.read"],
    knownLimits: "Posting/analytics require a paid X API tier.",
  },
  threads: {
    id: "threads", name: "Threads", brandIcon: null, accountTypes: ["profile"],
    oauthSupported: true, content: SUP, publishing: M, scheduling: M, analytics: LIM, inbox: NA, comments: NA, ads: NA, profileEditing: NA,
    tokenRefresh: true, live: false, requiredPermissions: ["threads_content_publish"],
    knownLimits: "Threads API is new/limited — manual export or supported publish only.",
  },
  google_business: {
    id: "google_business", name: "Google Business Profile", brandIcon: "google", accountTypes: ["location"],
    oauthSupported: true, content: SUP, publishing: M, scheduling: M, analytics: M, inbox: LIM, comments: NA, ads: NA, profileEditing: M,
    tokenRefresh: true, live: false, requiredPermissions: ["business.manage"],
    knownLimits: "Managed in Local Business Studio; needs approved Business Profile API access.",
  },
  wordpress: {
    id: "wordpress", name: "WordPress", brandIcon: "wordpress", accountTypes: ["site"],
    oauthSupported: false, content: SUP, publishing: SUP, scheduling: SUP, analytics: NA, inbox: NA, comments: NA, ads: NA, profileEditing: NA,
    tokenRefresh: false, live: true, requiredPermissions: ["application_password"],
    knownLimits: "Live via Application Password + REST API (publish/schedule work today).",
  },
  brevo: {
    id: "brevo", name: "Brevo (email)", brandIcon: "brevo", accountTypes: ["account"],
    oauthSupported: false, content: SUP, publishing: LIM, scheduling: LIM, analytics: LIM, inbox: NA, comments: NA, ads: NA, profileEditing: NA,
    tokenRefresh: false, live: false, requiredPermissions: ["api_key"],
    knownLimits: "Email campaign hand-off; per-user campaign send needs a list + verified sender.",
  },
};

export const SOCIAL_PROVIDER_IDS = Object.keys(SOCIAL_PROVIDERS) as SocialProviderId[];

export function getSocialProvider(id: SocialProviderId): SocialProvider | null {
  return SOCIAL_PROVIDERS[id] ?? null;
}

export function providerSupports(id: SocialProviderId, capability: keyof Pick<SocialProvider, "content" | "publishing" | "scheduling" | "analytics" | "inbox" | "comments" | "ads" | "profileEditing">): CapabilityLevel {
  const p = SOCIAL_PROVIDERS[id];
  return p ? (p[capability] as CapabilityLevel) : "not_available";
}

export const CAPABILITY_LABEL: Record<CapabilityLevel, string> = {
  supported: "Supported", limited: "Limited", manual: "Manual / export", not_available: "Not available",
};
