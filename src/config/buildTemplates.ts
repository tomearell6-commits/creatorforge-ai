/**
 * Build Studio starter templates — proven briefs that preload the wizard.
 * Admin can add more via the build_templates table; the API merges both.
 */
export type BuildTemplate = {
  id: string;
  name: string;
  category: string;       // group id
  projectType: string;    // type slug
  description: string;
  defaultIdea: string;
  estimatedCredits: number;
  tags: string[];
  isFeatured?: boolean;
  isPremium?: boolean;
};

export const BUILD_TEMPLATES: BuildTemplate[] = [
  { id: "bt-agency-site", name: "Digital Agency Website", category: "website", projectType: "agency-website",
    description: "Full agency site plan: services, case studies, team, lead capture.",
    defaultIdea: "A creative digital agency offering web design, branding, and paid ads for small businesses",
    estimatedCredits: 20, tags: ["agency", "services"], isFeatured: true },
  { id: "bt-portfolio", name: "Creator Portfolio", category: "website", projectType: "portfolio-website",
    description: "Personal portfolio with work showcase, about story, and booking CTA.",
    defaultIdea: "A portfolio for a freelance video editor showcasing reels, client logos, and packages",
    estimatedCredits: 20, tags: ["portfolio", "personal"] },
  { id: "bt-restaurant", name: "Restaurant Website", category: "website", projectType: "restaurant-website",
    description: "Menu-forward site with reservations, gallery, and local SEO plan.",
    defaultIdea: "A modern Italian restaurant needing online menu, reservations, and event bookings",
    estimatedCredits: 20, tags: ["restaurant", "local"] },
  { id: "bt-realestate-site", name: "Real Estate Agency Site", category: "website", projectType: "real-estate-website",
    description: "Listings-driven site plan with agent profiles and lead funnels.",
    defaultIdea: "A boutique real estate agency showcasing luxury listings with viewing-request funnels",
    estimatedCredits: 20, tags: ["real estate"], isFeatured: true },
  { id: "bt-shopify", name: "Shopify Store Blueprint", category: "ecommerce", projectType: "shopify-store-plan",
    description: "Complete store plan: collections, product page anatomy, checkout flow, launch promos.",
    defaultIdea: "A Shopify store selling eco-friendly home goods with subscription bundles",
    estimatedCredits: 20, tags: ["shopify", "ecommerce"], isFeatured: true },
  { id: "bt-course-store", name: "Course Store", category: "ecommerce", projectType: "course-store",
    description: "Digital course storefront with curriculum pages and upsell paths.",
    defaultIdea: "An online academy selling video courses for content creators with tiered pricing",
    estimatedCredits: 20, tags: ["courses", "digital"] },
  { id: "bt-saas-landing", name: "SaaS Landing Page", category: "landing", projectType: "saas-landing-page",
    description: "Conversion-focused SaaS page: hero, social proof, pricing, FAQ, CTA ladder.",
    defaultIdea: "A landing page for an AI scheduling tool targeting busy agencies, goal: trial signups",
    estimatedCredits: 20, tags: ["saas", "landing"], isFeatured: true },
  { id: "bt-webinar-page", name: "Webinar Registration Page", category: "landing", projectType: "webinar-page",
    description: "Registration page plan with reminder email sequence outline.",
    defaultIdea: "A webinar page for a live masterclass on real estate investing, goal: registrations",
    estimatedCredits: 20, tags: ["webinar", "leads"] },
  { id: "bt-saas-app", name: "SaaS MVP Blueprint", category: "webapp", projectType: "saas-app",
    description: "Full MVP spec: auth, roles, billing, dashboard, schema, API routes, 12-week roadmap.",
    defaultIdea: "A SaaS that helps freelancers track invoices and get paid faster, subscription model",
    estimatedCredits: 20, tags: ["saas", "mvp"], isFeatured: true, isPremium: true },
  { id: "bt-crm", name: "CRM App Plan", category: "webapp", projectType: "crm-app",
    description: "CRM structure: pipelines, contacts, tasks, roles, reporting.",
    defaultIdea: "A lightweight CRM for real estate agents managing leads and viewings",
    estimatedCredits: 20, tags: ["crm"] },
  { id: "bt-marketplace", name: "Marketplace App Plan", category: "webapp", projectType: "marketplace-app",
    description: "Two-sided marketplace spec: listings, payments, trust features.",
    defaultIdea: "A marketplace connecting homeowners with vetted local tradespeople",
    estimatedCredits: 20, tags: ["marketplace"], isPremium: true },
  { id: "bt-fitness-app", name: "Fitness App Concept", category: "mobile", projectType: "fitness-app",
    description: "Mobile concept: onboarding, workout plans, streaks, subscription.",
    defaultIdea: "A mobile fitness app with AI-personalized home workout plans and habit streaks",
    estimatedCredits: 20, tags: ["fitness", "mobile"] },
  { id: "bt-ai-assistant-app", name: "AI Assistant App Concept", category: "mobile", projectType: "ai-assistant-app",
    description: "AI companion app spec: chat UX, memory, monetization.",
    defaultIdea: "A mobile AI assistant that helps small business owners plan their day",
    estimatedCredits: 20, tags: ["ai", "mobile"], isFeatured: true },
  { id: "bt-sales-funnel", name: "Product Sales Funnel", category: "funnel", projectType: "sales-funnel",
    description: "Full funnel: ad → landing → checkout → upsell → email follow-up.",
    defaultIdea: "A sales funnel for a $49 digital product with an order-bump and 5-email follow-up",
    estimatedCredits: 20, tags: ["funnel", "sales"], isFeatured: true },
  { id: "bt-leadmagnet", name: "Lead Magnet Funnel", category: "funnel", projectType: "lead-magnet-funnel",
    description: "Free-download funnel with nurture sequence outline.",
    defaultIdea: "A lead magnet funnel giving away a free checklist to build an email list for a coach",
    estimatedCredits: 20, tags: ["leads", "email"] },
];

export const getBuildTemplateById = (id: string): BuildTemplate | undefined =>
  BUILD_TEMPLATES.find((t) => t.id === id);
