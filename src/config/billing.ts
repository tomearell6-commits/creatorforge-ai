/**
 * Billing Center configuration — the plan comparison matrix and billing UI
 * constants. Plan IDENTITY (ids, prices, credits) lives in lib/constants PLANS;
 * this file describes what each plan can DO, rendered in the comparison table
 * and seeded into subscription_features.
 */

export type FeatureValue = boolean | string;

export type ComparisonRow = {
  key: string;
  label: string;
  group: "studios" | "capacity" | "collaboration" | "support";
  /** value per plan id */
  values: Record<string, FeatureValue>;
};

const ALL = { free: true, creator: true, pro: true, agency: true, enterprise: true } as const;
const PAID_UP = { free: false, creator: true, pro: true, agency: true, enterprise: true } as const;
const PRO_UP = { free: false, creator: false, pro: true, agency: true, enterprise: true } as const;
const BIZ_UP = { free: false, creator: false, pro: false, agency: true, enterprise: true } as const;

export const COMPARISON_ROWS: ComparisonRow[] = [
  // ---- Studios ----
  { key: "ai_video",      label: "AI Video Studio",          group: "studios", values: { ...ALL, free: "Slideshow only" } },
  { key: "ai_seo",        label: "AI SEO Studio",            group: "studios", values: ALL },
  { key: "ai_books",      label: "AI Books",                 group: "studios", values: ALL },
  { key: "automation",    label: "Automation Studio (Autopilot)", group: "studios", values: { free: "1 campaign", creator: "3 campaigns", pro: "10 campaigns", agency: "Unlimited", enterprise: "Unlimited" } },
  { key: "marketing",     label: "Marketing Studio (Ads)",   group: "studios", values: ALL },
  { key: "publishing",    label: "Publishing Studio",        group: "studios", values: { free: "2 channels", creator: "5 channels", pro: "All channels", agency: "All channels", enterprise: "All channels" } },
  { key: "analytics",     label: "Analytics Studio",         group: "studios", values: PAID_UP },
  { key: "business",      label: "Business Studio (Build)",  group: "studios", values: ALL },
  { key: "lead_gen",      label: "Lead Generator",           group: "studios", values: { free: false, creator: "Preview", pro: true, agency: true, enterprise: true } },
  { key: "design",        label: "Design Studio",            group: "studios", values: ALL },
  { key: "build",         label: "Build Studio",             group: "studios", values: ALL },
  { key: "real_estate",   label: "Real Estate Suite",        group: "studios", values: PAID_UP },
  // ---- Capacity ----
  { key: "credits",       label: "Monthly credits",          group: "capacity", values: { free: "50 (trial)", creator: "500", pro: "2,000", agency: "8,000", enterprise: "Custom" } },
  { key: "topups",        label: "Credit top-ups",           group: "capacity", values: PAID_UP },
  { key: "storage",       label: "Media storage",            group: "capacity", values: { free: "500 MB", creator: "5 GB", pro: "25 GB", agency: "100 GB", enterprise: "Custom" } },
  { key: "custom_domains", label: "Hosted sites on your own domain", group: "capacity", values: { free: false, creator: false, pro: "1", agency: "5", enterprise: "Unlimited" } },
  { key: "workspaces",    label: "Workspaces",               group: "capacity", values: { free: "1", creator: "1", pro: "3", agency: "10", enterprise: "Custom" } },
  { key: "exports",       label: "Export formats",           group: "capacity", values: { free: "Watermarked", creator: "PNG · JPG · MP4", pro: "All formats + PDF", agency: "All formats + PDF", enterprise: "All formats + PDF" } },
  { key: "api",           label: "API access",               group: "capacity", values: { ...BIZ_UP, agency: "Coming soon", enterprise: "Custom" } },
  // ---- Collaboration ----
  { key: "team",          label: "Team members",             group: "collaboration", values: { free: "1", creator: "1", pro: "3 (soon)", agency: "10 (soon)", enterprise: "Custom" } },
  { key: "branding",      label: "Custom branding / white-label", group: "collaboration", values: { ...BIZ_UP, agency: "Coming soon", enterprise: true } },
  // ---- Support ----
  { key: "support",       label: "Support level",            group: "support", values: { free: "Community", creator: "Email", pro: "Priority", agency: "Dedicated", enterprise: "Enterprise SLA" } },
  { key: "priority",      label: "Priority support",         group: "support", values: PRO_UP },
  { key: "enterprise_support", label: "Enterprise support & onboarding", group: "support", values: { free: false, creator: false, pro: false, agency: false, enterprise: true } },
];

export const COMPARISON_GROUPS: { id: ComparisonRow["group"]; label: string }[] = [
  { id: "studios", label: "Studios & Tools" },
  { id: "capacity", label: "Credits & Capacity" },
  { id: "collaboration", label: "Collaboration" },
  { id: "support", label: "Support" },
];

/** Billing sub-navigation (rendered on every /dashboard/billing page). */
export const BILLING_NAV = [
  { href: "/dashboard/billing", label: "Overview" },
  { href: "/dashboard/billing/plans", label: "Plans" },
  { href: "/dashboard/billing/credits", label: "Credits" },
  { href: "/dashboard/billing/usage", label: "Usage" },
  { href: "/dashboard/billing/invoices", label: "Invoices" },
  { href: "/dashboard/billing/history", label: "History" },
  { href: "/dashboard/billing/payment-methods", label: "Payment Methods" },
  { href: "/dashboard/billing/support", label: "Support" },
];

/** Low-credit warning thresholds (fractions of the monthly allowance). */
export const CREDIT_WARN_LEVELS = [
  { fraction: 0.05, severity: "critical" as const, label: "below 5%" },
  { fraction: 0.15, severity: "warning" as const, label: "below 15%" },
  { fraction: 0.3,  severity: "info" as const,    label: "below 30%" },
];

/** Subscription-expiry warning thresholds (days before current_period_end). */
export const EXPIRY_WARN_DAYS = [30, 14, 7, 3, 1];

/** Usage categories: map credit_usage.reason prefixes → display buckets. */
export const USAGE_CATEGORIES: { id: string; label: string; prefixes: string[] }[] = [
  { id: "ai_video",   label: "AI Videos",        prefixes: ["SCRIPT", "VIDEO", "RENDER", "VOICEOVER", "SCENE", "AVATAR"] },
  { id: "seo",        label: "SEO Articles",     prefixes: ["SEO", "BLOG", "AUDIT"] },
  { id: "books",      label: "Book Writing",     prefixes: ["BOOK"] },
  { id: "images",     label: "Image Generation", prefixes: ["IMAGE", "THUMBNAIL", "DESIGN", "FOOTAGE", "RE_", "REALESTATE"] },
  { id: "email",      label: "Email Assistant",  prefixes: ["EMAIL"] },
  { id: "leads",      label: "Lead Generation",  prefixes: ["LEAD"] },
  { id: "automation", label: "Automation",       prefixes: ["AUTOPILOT", "AUTOMATION", "CAMPAIGN"] },
  { id: "build",      label: "Build Studio",     prefixes: ["BUILD"] },
  { id: "ads",        label: "Advertising",      prefixes: ["AD_", "ADS"] },
  { id: "other",      label: "Other",            prefixes: [] },
];

export function usageCategoryFor(reason: string): string {
  const upper = (reason || "").toUpperCase();
  for (const cat of USAGE_CATEGORIES) {
    if (cat.prefixes.some((p) => upper.startsWith(p))) return cat.id;
  }
  return "other";
}
