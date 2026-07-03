/**
 * Build Studio — taxonomy: 6 builder groups, 68 project types, goals, styles,
 * page/app structure catalogues, and credit costs. slug = kebab(name).
 * HONESTY RULE: Build Studio generates professional plans, structures, copy,
 * and developer briefs — it does not deploy running applications.
 */

export type BuildGroup = {
  id: string;
  name: string;
  icon: string;      // lucide icon name
  description: string;
  order: number;
};

export type BuildProjectType = { name: string; slug: string; group: string; featured?: boolean };

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const BUILD_GROUPS: BuildGroup[] = [
  { id: "website", name: "Website Builder", icon: "Globe", description: "Business sites, portfolios, blogs and industry websites.", order: 1 },
  { id: "ecommerce", name: "Ecommerce Builder", icon: "ShoppingBag", description: "Store plans for Shopify, WooCommerce and digital products.", order: 2 },
  { id: "landing", name: "Landing Page Builder", icon: "Layout", description: "High-converting single pages for launches and offers.", order: 3 },
  { id: "webapp", name: "Web App Builder", icon: "AppWindow", description: "SaaS MVPs, dashboards, portals and internal tools.", order: 4 },
  { id: "mobile", name: "Mobile App Builder", icon: "Smartphone", description: "iOS/Android/cross-platform app concepts and specs.", order: 5 },
  { id: "funnel", name: "Marketing Funnel Builder", icon: "Filter", description: "Sales, lead-magnet, webinar and launch funnels.", order: 6 },
];

const GROUP_TYPES: Record<string, (string | { name: string; featured?: boolean })[]> = {
  website: [
    { name: "Business Website", featured: true }, "Personal Brand Website", "Agency Website",
    { name: "Portfolio Website", featured: true }, "Blog Website", "News Website", "Directory Website",
    "Real Estate Website", "Restaurant Website", "Education Website", "Healthcare Website",
    "Legal Website", "Finance Website", "Construction Website", "Travel Website", "Event Website",
  ],
  ecommerce: [
    { name: "Shopify Store Plan", featured: true }, "WooCommerce Store Plan", "Digital Product Store",
    "Dropshipping Store", "Fashion Store", "Beauty Store", "Pet Store", "Electronics Store",
    "Book Store", "Course Store", "Subscription Store",
  ],
  landing: [
    { name: "Product Landing Page", featured: true }, { name: "SaaS Landing Page", featured: true },
    "Lead Generation Page", "Webinar Page", "Course Sales Page", "Book Sales Page", "App Launch Page",
    "Real Estate Listing Page", "Service Offer Page", "Affiliate Offer Page",
  ],
  webapp: [
    { name: "SaaS App", featured: true }, "Dashboard App", "CRM App", "Booking App", "Marketplace App",
    "Membership App", { name: "AI Tool App", featured: true }, "Client Portal", "Analytics Dashboard",
    "Admin Panel", "Productivity Tool",
  ],
  mobile: [
    "iOS App Concept", "Android App Concept", { name: "Cross-Platform App", featured: true },
    "Fitness App", "Education App", "Finance App", "Ecommerce App", "Social App", "Delivery App",
    "Booking App (Mobile)", "AI Assistant App",
  ],
  funnel: [
    { name: "Sales Funnel", featured: true }, "Lead Magnet Funnel", "Email Funnel", "Webinar Funnel",
    "Product Launch Funnel", "Affiliate Funnel", "Course Funnel", "Book Launch Funnel", "Ecommerce Funnel",
  ],
};

export const BUILD_PROJECT_TYPES: BuildProjectType[] = BUILD_GROUPS.flatMap((g) =>
  (GROUP_TYPES[g.id] ?? []).map((raw) => {
    const item = typeof raw === "string" ? { name: raw } : raw;
    return { name: item.name, slug: slugify(item.name), group: g.id, featured: item.featured ?? false };
  })
);

export const getBuildTypeBySlug = (slug: string): BuildProjectType | undefined =>
  BUILD_PROJECT_TYPES.find((t) => t.slug === slug);
export const getBuildTypesForGroup = (groupId: string): BuildProjectType[] =>
  BUILD_PROJECT_TYPES.filter((t) => t.group === groupId);

export const BUILD_GOALS = [
  "Sales", "Leads", "Subscriptions", "Bookings", "Downloads", "Community", "Education", "Brand awareness",
] as const;

export const BUILD_STYLES = [
  "Modern", "Luxury", "Minimal", "Corporate", "Friendly", "Bold", "Tech", "Creative", "Professional",
] as const;

/** Website page-template catalogue (used to seed page structures + the editor). */
export const WEBSITE_PAGE_TEMPLATES = [
  "Homepage", "About", "Services", "Pricing", "Blog", "Contact", "FAQ", "Testimonials", "Portfolio",
  "Case Studies", "Product Pages", "Checkout", "Login", "Signup", "Dashboard", "Help Center",
] as const;

/** App structure elements the app-spec generator covers. */
export const APP_STRUCTURE_ELEMENTS = [
  "Authentication flow", "Dashboard layout", "User roles", "Settings page", "Billing page",
  "Admin panel", "Notifications", "Analytics", "Database schema", "API routes", "Feature backlog",
] as const;

// ---- Credits ---------------------------------------------------------------
export const BUILD_CREDIT_COSTS = {
  fullPackage: 20,     // complete project package (structure+copy+features+roadmap+marketing+spec)
  copyOnly: 10,        // website copy regeneration
  roadmap: 8,          // roadmap regeneration
  marketingPlan: 8,    // marketing plan regeneration
  sitemap: 4,
  schema: 6,
  exportStandard: 0,   // markdown / copy package / prompt package (client-side)
  exportPdf: 1,        // print-to-PDF brief
} as const;

export const BUILD_CREDIT_REASONS = {
  fullPackage: "BUILD_PACKAGE",
  copyOnly: "BUILD_COPY",
  roadmap: "BUILD_ROADMAP",
  marketingPlan: "BUILD_MARKETING",
  sitemap: "BUILD_SITEMAP",
  schema: "BUILD_SCHEMA",
  exportPdf: "BUILD_EXPORT_PDF",
} as const;
