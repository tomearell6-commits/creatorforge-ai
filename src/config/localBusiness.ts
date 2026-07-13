/**
 * Local Business Studio configuration — single source of truth for post types,
 * audit categories, credit pricing, plan gating, and automation. NOT a ranking
 * product: scores are "Profile Health" / "Local Visibility Readiness", never a
 * guaranteed Google ranking.
 */

// ---- Credit pricing (configurable) ---------------------------------------
export const LB_CREDIT_COSTS = {
  quick_audit: 20,
  full_audit: 60,
  multi_location_audit_per_extra: 50,
  description_optimize: 10,
  post: 5,
  post_with_image: 20,
  review_reply: 2,
  monthly_content_plan: 25,
  full_local_seo_plan: 40,
  report: 15,
  social_variation_pack: 10,
} as const;
export type LbCreditAction = keyof typeof LB_CREDIT_COSTS;

// Free (never charged): connect, view data/calendar/reports, manual edits, disconnect.

// ---- Post types -----------------------------------------------------------
export const LB_POST_TYPES = [
  "business_update", "product_spotlight", "service_spotlight", "special_offer",
  "event", "seasonal_promotion", "business_announcement", "educational_tip",
  "customer_appreciation", "new_arrival", "new_service", "holiday_hours",
  "community_update", "behind_the_scenes", "local_news", "limited_time_promotion",
] as const;
export type LbPostType = (typeof LB_POST_TYPES)[number];

export function lbPostTypeLabel(t: LbPostType): string {
  return t.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// ---- Image types ----------------------------------------------------------
export const LB_IMAGE_TYPES = [
  "promotional", "product", "service_banner", "seasonal", "event", "offer",
  "announcement", "new_arrival", "community", "branded_quote", "storefront",
  "before_after", "team_intro",
] as const;
export type LbImageType = (typeof LB_IMAGE_TYPES)[number];

// ---- Audit categories -----------------------------------------------------
export type LbAuditCategory = "completeness" | "content" | "brand" | "seo" | "engagement";
export const LB_AUDIT_CATEGORIES: { id: LbAuditCategory; label: string; weight: number }[] = [
  { id: "completeness", label: "Profile Completeness", weight: 0.30 },
  { id: "content", label: "Content Activity", weight: 0.20 },
  { id: "brand", label: "Brand Quality", weight: 0.15 },
  { id: "seo", label: "Local SEO Readiness", weight: 0.20 },
  { id: "engagement", label: "Customer Engagement", weight: 0.15 },
];

/** Completeness checks (fields we can evaluate from stored/available profile data). */
export const LB_COMPLETENESS_CHECKS: { key: string; label: string; severity: "warning" | "critical" }[] = [
  { key: "business_name", label: "Business name", severity: "critical" },
  { key: "primary_category", label: "Primary category", severity: "critical" },
  { key: "additional_categories", label: "Additional categories", severity: "warning" },
  { key: "description", label: "Business description", severity: "critical" },
  { key: "address", label: "Address", severity: "critical" },
  { key: "phone", label: "Phone", severity: "critical" },
  { key: "website", label: "Website", severity: "warning" },
  { key: "hours", label: "Opening hours", severity: "critical" },
  { key: "special_hours", label: "Special hours", severity: "warning" },
  { key: "appointment_url", label: "Appointment link", severity: "warning" },
  { key: "products", label: "Products", severity: "warning" },
  { key: "services", label: "Services", severity: "warning" },
  { key: "attributes", label: "Attributes", severity: "warning" },
];

export function scoreStatus(score: number): { label: string; tone: "success" | "info" | "warning" | "danger" } {
  if (score >= 85) return { label: "Strong", tone: "success" };
  if (score >= 70) return { label: "Good", tone: "info" };
  if (score >= 50) return { label: "Needs improvement", tone: "warning" };
  return { label: "Critical attention required", tone: "danger" };
}

// ---- Review reply tones ---------------------------------------------------
export const LB_REVIEW_TONES = ["professional", "warm", "appreciative", "apologetic", "direct", "customer_care"] as const;
export type LbReviewTone = (typeof LB_REVIEW_TONES)[number];

// ---- Plan gating ----------------------------------------------------------
export type PlanId = "starter" | "creator" | "pro" | "agency"; // maps to existing plan ids
export const LB_PLAN_ACCESS: Record<string, { minPlan: PlanId; label: string }> = {
  view_profile: { minPlan: "starter", label: "View connected profile" },
  ai_posts: { minPlan: "creator", label: "AI posts" },
  basic_audit: { minPlan: "creator", label: "Profile audit" },
  image_generation: { minPlan: "creator", label: "AI images" },
  scheduling: { minPlan: "creator", label: "Scheduling" },
  multi_location: { minPlan: "pro", label: "Multiple locations" },
  full_audit: { minPlan: "pro", label: "Full audits" },
  review_assistant: { minPlan: "pro", label: "Review Reply Assistant" },
  local_seo_planner: { minPlan: "pro", label: "Local SEO Planner" },
  reports: { minPlan: "pro", label: "Reports" },
  team_approval: { minPlan: "agency", label: "Team approval" },
  agency_workspaces: { minPlan: "agency", label: "Agency workspaces" },
};

// ---- Automation ----------------------------------------------------------
export type LbAutomationMode = "manual" | "assisted" | "autopilot";
export const LB_DEFAULT_AUTOMATION_MODE: LbAutomationMode = "assisted";
export const LB_AUTOMATION_RULE_TYPES = [
  "weekly_business_update", "friday_product_spotlight", "seasonal_pre_event",
] as const;

// ---- Location filters -----------------------------------------------------
export const LB_LOCATION_FILTERS = ["all", "healthy", "needs_attention", "disconnected", "low_activity", "missing_information"] as const;
export type LbLocationFilter = (typeof LB_LOCATION_FILTERS)[number];

// ---- Studio pages (for nav + overview) -----------------------------------
export const LB_PAGES = [
  { id: "overview", label: "Overview", route: "/dashboard/grow/local-business" },
  { id: "profiles", label: "Business Profiles", route: "/dashboard/grow/local-business/profiles" },
  { id: "audit", label: "Profile Audit", route: "/dashboard/grow/local-business/audit" },
  { id: "optimizer", label: "Profile Optimizer", route: "/dashboard/grow/local-business/optimizer" },
  { id: "posts", label: "Post Generator", route: "/dashboard/grow/local-business/posts" },
  { id: "images", label: "AI Image Generator", route: "/dashboard/grow/local-business/images" },
  { id: "calendar", label: "Content Calendar", route: "/dashboard/grow/local-business/calendar" },
  { id: "publishing", label: "Publishing Queue", route: "/dashboard/grow/local-business/publishing" },
  { id: "reviews", label: "Review Reply Assistant", route: "/dashboard/grow/local-business/reviews" },
  { id: "products-services", label: "Products & Services", route: "/dashboard/grow/local-business/products-services" },
  { id: "local-seo", label: "Local SEO Planner", route: "/dashboard/grow/local-business/local-seo" },
  { id: "insights", label: "Business Insights", route: "/dashboard/grow/local-business/insights" },
  { id: "reports", label: "Reports", route: "/dashboard/grow/local-business/reports" },
  { id: "settings", label: "Settings", route: "/dashboard/grow/local-business/settings" },
] as const;
