/**
 * Create · Grow · Manage — the dashboard's master navigation model.
 *
 * Three areas → sections (studios/centers) → children (tools). Consumed by the
 * sidebar, the dashboard home, the area pages, breadcrumbs, Quick Create and
 * global search. EVERY route points at a page that already exists — this file
 * reorganizes the platform, it never invents destinations.
 *
 * Legacy configs still in use underneath: config/studios.ts powers the studio
 * hub pages themselves; config/contentCategories.ts powers the Create Hub grid.
 */
import {
  Video, Palette, Hammer, BookOpen, Megaphone, Workflow, BarChart3, Briefcase,
  CreditCard, Wallet, Bell, ShieldCheck, Plug, Settings, LayoutGrid, Image as ImageIcon,
  Music, FileText, Clapperboard, Library, Server, LayoutTemplate, Building2, Sparkles,
  CalendarDays, ListChecks, Rocket, Globe, Share2, Mail, Search, Users, Handshake,
  Gift, KeyRound, LifeBuoy, PenLine, FileDown, Target, FileSearch, Type, Send,
} from "lucide-react";

export type NavAreaId = "create" | "grow" | "manage";

export type DashNavChild = {
  id: string;
  label: string;
  route: string;
  icon: typeof Video;
  description: string;
  /** data-tour attribute (guided tours target these — keep stable). */
  tour?: string;
  /** Minimum plan id (creator < pro < agency). Locked = link to upgrade. */
  requiredPlan?: "creator" | "pro" | "agency";
  isEnabled?: boolean; // default true; false renders "Coming soon"
  order: number;
};

export type DashNavSection = {
  id: string;
  label: string;
  group: NavAreaId;
  route: string;
  icon: typeof Video;
  description: string;
  tour?: string;
  children: DashNavChild[];
  order: number;
};

export type DashNavArea = {
  id: NavAreaId;
  label: string;
  headline: string;       // dashboard-home section title
  description: string;
  sections: DashNavSection[];
};

const c = (
  id: string, label: string, route: string, icon: typeof Video, description: string,
  order: number, extra: Partial<DashNavChild> = {}
): DashNavChild => ({ id, label, route, icon, description, order, ...extra });

export const DASHBOARD_NAV: DashNavArea[] = [
  {
    id: "create",
    label: "Create",
    headline: "Create Something",
    description: "Build content, designs, websites, books and publishing assets.",
    sections: [
      {
        id: "content-studio", label: "Content Studio", group: "create",
        route: "/dashboard/studio/content", icon: Video, order: 1,
        description: "Videos, articles, images, voiceovers and every content format.",
        children: [
          c("ai-video", "AI Video Studio", "/dashboard/create?group=video", Video, "Faceless videos, shorts and long-form", 1, { tour: "ai-video-studio" }),
          c("scene-builder", "Scene Builder", "/dashboard/scenes", Clapperboard, "Turn a script into video scenes: images, narration, captions", 2),
          c("ai-shorts", "AI Shorts", "/dashboard/create/ai-shorts", Clapperboard, "Vertical short-form for Reels/Shorts/TikTok", 3),
          c("seo-articles", "SEO Articles", "/dashboard/seo", Search, "SEO Studio: generate & publish articles", 4, { tour: "seo-studio" }),
          c("blog-writer", "Script & Blog Writer", "/dashboard/generate", FileText, "Scripts, blogs and written content", 5),
          c("image-generator", "Image Generator", "/dashboard/create?group=image", ImageIcon, "AI images and thumbnails", 6),
          c("voiceover", "Voiceover Studio", "/dashboard/voice", Music, "AI voiceovers in premium voices", 7),
          c("podcast-scripts", "Podcast Scripts", "/dashboard/create/podcast-scripts", Type, "Episode outlines and show notes", 8),
          c("templates", "Templates", "/dashboard/templates", LayoutTemplate, "Ready-made content templates", 9, { tour: "templates" }),
          c("media-library", "Media Library", "/dashboard/assets", Library, "Everything you've generated", 10),
          c("render-queue", "Render Queue", "/dashboard/render", Server, "Render projects to MP4", 11, { tour: "render-queue" }),
        ],
      },
      {
        id: "design-studio", label: "Design Studio", group: "create",
        route: "/dashboard/design", icon: Palette, order: 2, tour: "create-first-design",
        description: "Graphics, brand kits, industry suites and visual assets.",
        children: [
          c("design-new", "AI Design Studio", "/dashboard/design/new", Sparkles, "Design graphics with AI concepts", 1),
          c("design-templates", "Template Gallery", "/dashboard/design/templates", LayoutTemplate, "Editable design templates", 2),
          c("brand-kit", "Brand Design", "/dashboard/design/brand-kit", Palette, "Logos, colors, fonts and brand kits", 3),
          c("real-estate", "Real Estate & Architecture", "/dashboard/design/industries/real-estate-architecture", Building2, "Property concepts, floor plans, walkthroughs", 4),
          c("industry-suites", "Industry Suites", "/dashboard/design/industries", LayoutGrid, "Specialized design workspaces", 5),
          c("video-graphics", "Video Graphics", "/dashboard/design/video-graphics", Clapperboard, "Live AI footage prompt designer", 6),
          c("design-exports", "Export Center", "/dashboard/design/exports", FileDown, "PNG, JPG and PDF exports", 7),
        ],
      },
      {
        id: "build-studio", label: "Build Studio", group: "create",
        route: "/dashboard/build", icon: Hammer, order: 3, tour: "plan-first-product",
        description: "Plan websites, apps, stores and funnels — complete briefs.",
        children: [
          c("build-website", "Website Builder", "/dashboard/build/new?builder=website", Globe, "Plan a complete website", 1),
          c("build-app", "App Builder", "/dashboard/build/new?builder=webapp", Hammer, "Plan a web or mobile app", 2),
          c("build-landing", "Landing Pages", "/dashboard/build/new?builder=landing", FileText, "High-converting landing page plans", 3),
          c("build-ecommerce", "Ecommerce Builder", "/dashboard/build/new?builder=ecommerce", Briefcase, "Plan an online store", 4),
          c("build-saas", "SaaS App Planner", "/dashboard/build/new?builder=webapp", Rocket, "Plan a SaaS product", 5),
          c("build-funnel", "Marketing Funnel Builder", "/dashboard/build/new?builder=funnel", Target, "Plan a conversion funnel", 6),
          c("build-briefs", "Export Briefs", "/dashboard/build/projects", FileDown, "Developer briefs & prompt packages", 7),
          c("browser-studio", "Browser Studio", "/dashboard/browser", Globe, "Inspect, preview & optimize any web page", 8),
        ],
      },
      {
        id: "publishing-studio", label: "Publishing Studio", group: "create",
        route: "/dashboard/studio/publishing", icon: BookOpen, order: 4,
        description: "Write, design, market and export complete books.",
        children: [
          c("book-writer", "Book Writer", "/dashboard/books/new", PenLine, "Start a new AI-assisted book", 1),
          c("chapter-editor", "Chapter Editor", "/dashboard/books/library", BookOpen, "Your books and chapters", 2),
          c("cover-studio", "Cover Studio", "/dashboard/books/cover", ImageIcon, "AI book covers", 3),
          c("illustrations", "Illustration Studio", "/dashboard/create?group=image", Sparkles, "AI illustrations and imagery", 4),
          c("book-marketing", "Book Marketing", "/dashboard/books/marketing", Megaphone, "Blurbs, ads and launch copy", 5),
          c("book-export", "Book Export Center", "/dashboard/books/export", FileDown, "Export manuscripts", 6),
        ],
      },
    ],
  },
  {
    id: "grow",
    label: "Grow",
    headline: "Grow Your Business",
    description: "Market, automate, analyze and expand your business.",
    sections: [
      {
        id: "marketing-studio", label: "Marketing Studio", group: "grow",
        route: "/dashboard/studio/marketing", icon: Megaphone, order: 1, tour: "ai-ad-studio",
        description: "Ads, campaigns and marketing creatives.",
        children: [
          c("ads", "AI Advertising Studio", "/dashboard/ads", Megaphone, "Ad campaigns across every platform", 1),
          c("social-ads", "Social Media Ads", "/dashboard/create?group=ad", Share2, "Facebook, Instagram, TikTok ad creatives", 2),
          c("campaign-builder", "Campaign Builder", "/dashboard/ads/create", Target, "Build a full ad campaign", 3),
          c("landing-copy", "Landing Page Copy", "/dashboard/build/new?builder=landing", FileText, "Copy-complete landing page plans", 4),
          c("email-campaigns", "Email Campaigns", "/dashboard/autopilot/campaigns/new", Send, "Automated email & newsletter campaigns", 5),
          c("creative-library", "Creative Library", "/dashboard/assets", Library, "All your marketing assets", 6),
          c("campaign-reports", "Campaign Reports", "/dashboard/autopilot/reports", BarChart3, "Campaign performance reports", 7),
        ],
      },
      {
        id: "automation-studio", label: "Automation Studio", group: "grow",
        route: "/dashboard/studio/automation", icon: Workflow, order: 2,
        description: "Autopilot, scheduling and workflow automation.",
        children: [
          c("autopilot", "CreatorsForge Autopilot", "/dashboard/autopilot", Rocket, "Configure once — plan, schedule, publish", 1),
          c("automation-rules", "Automation Rules", "/dashboard/autopilot/rules", ListChecks, "Rules that steer your campaigns", 2),
          c("calendar", "Publishing Calendar", "/dashboard/calendar", CalendarDays, "Plan and schedule your posts", 3, { tour: "publishing-calendar" }),
          c("approval-queue", "Approval Queue", "/dashboard/autopilot/queue", ListChecks, "Review before anything goes live", 4),
          c("social-scheduling", "Social Scheduling", "/dashboard/publish", Share2, "Publish to connected platforms", 5),
          c("wp-scheduling", "WordPress Scheduling", "/dashboard/seo/calendar", Globe, "Scheduled blog publishing", 6),
          c("workflows", "Workflow Builder", "/dashboard/automation", Workflow, "Trigger-based automations", 7),
        ],
      },
      {
        id: "analytics-studio", label: "Analytics Studio", group: "grow",
        route: "/dashboard/studio/analytics", icon: BarChart3, order: 3,
        description: "Audits, performance and growth insight.",
        children: [
          c("seo-audit", "SEO & Website Audit", "/dashboard/seo/audit", FileSearch, "Full site audit with scores + fix plan", 1),
          c("analytics", "Campaign Analytics", "/dashboard/analytics", BarChart3, "Views, engagement and growth", 2),
          c("seo-reports", "SEO Reports", "/dashboard/seo", Search, "Article and publishing performance", 3),
          c("content-performance", "Content Performance", "/dashboard/reports/weekly", FileText, "Weekly content reports", 4),
          c("credit-usage", "Credit Usage Reports", "/dashboard/billing/usage", Wallet, "Where your credits go", 5),
        ],
      },
      {
        id: "business-studio", label: "Business Studio", group: "grow",
        route: "/dashboard/business", icon: Briefcase, order: 4,
        description: "AI Business Operations Manager — profile, inquiries, documents, leads and teams.",
        children: [
          c("biz-ops", "AI Business Manager", "/dashboard/business", Briefcase, "Executive dashboard, health score & automation", 1),
          c("biz-inquiries", "Inquiry Center", "/dashboard/business/inquiries", Send, "Enquiries with AI triage and draft replies", 2),
          c("biz-documents", "Document Generator", "/dashboard/business/documents", FileText, "Quotations, invoices, proposals", 3),
          c("leads", "Lead Generator", "/dashboard/leads", Target, "Find and qualify B2B leads", 4, { requiredPlan: "pro" }),
          c("email-assistant", "AI Email Assistant", "/dashboard/email", Mail, "Inbox triage, drafts and summaries", 5),
          c("crm", "CRM", "/dashboard/leads", Users, "Customer relationship management", 6, { isEnabled: false }),
          c("team", "Team & Workspaces", "/dashboard/team", Users, "Members, roles and client workspaces", 7),
          c("affiliate", "Affiliate Program", "/dashboard/affiliate", Handshake, "Earn 30% commissions", 8),
          c("referrals", "Referral Program", "/dashboard/referrals", Gift, "Invite friends, earn credits", 9),
          c("invoices", "Invoices", "/dashboard/billing/invoices", FileText, "Your receipts and invoices", 10),
        ],
      },
    ],
  },
  {
    id: "manage",
    label: "Manage",
    headline: "Manage Your Account",
    description: "Billing, credits, security, integrations and settings.",
    sections: [
      {
        id: "billing", label: "Subscription & Billing", group: "manage",
        route: "/dashboard/billing", icon: CreditCard, order: 1,
        description: "Plan, invoices, payments and usage in one place.",
        children: [
          c("current-plan", "Current Plan", "/dashboard/billing", CreditCard, "Your subscription overview", 1),
          c("plans", "Available Plans", "/dashboard/billing/plans", LayoutGrid, "Compare and upgrade", 2),
          c("billing-invoices", "Invoices", "/dashboard/billing/invoices", FileText, "Numbered invoices and receipts", 3),
          c("billing-history", "Billing History", "/dashboard/billing/history", ListChecks, "Every billing event", 4),
          c("payment-methods", "Payment Methods", "/dashboard/billing/payment-methods", Wallet, "Crypto and card preferences", 5),
          c("billing-usage", "Usage", "/dashboard/billing/usage", BarChart3, "Credit usage analytics", 6),
        ],
      },
      {
        id: "credits", label: "Credit Wallet", group: "manage",
        route: "/dashboard/credits", icon: Wallet, order: 2, tour: "credit-topup",
        description: "Balance, top-ups and the credit calculator.",
        children: [
          c("topup", "Top Up Credits", "/dashboard/credits", Wallet, "Buy credits with crypto", 1),
          c("credit-history", "Credit History", "/dashboard/billing/history", ListChecks, "Top-ups and adjustments", 2),
          c("calculator", "Usage Calculator", "/dashboard/credits#calculator", BarChart3, "Estimate credit costs", 3),
        ],
      },
      {
        id: "notifications", label: "Notifications", group: "manage",
        route: "/dashboard/notifications", icon: Bell, order: 3,
        description: "Alerts, summaries and reminders.",
        children: [
          c("notification-center", "Notification Center", "/dashboard/notifications", Bell, "Everything that needs your attention", 1),
          c("weekly-summary", "Weekly Summary", "/dashboard/reports/weekly", FileText, "Your weekly usage report", 2),
          c("notification-prefs", "Email Alerts & Preferences", "/dashboard/settings", Settings, "Choose how we keep you informed", 3),
        ],
      },
      {
        id: "security", label: "Security", group: "manage",
        route: "/dashboard/settings", icon: ShieldCheck, order: 4,
        description: "Password, 2FA and account protection.",
        children: [
          c("password", "Change Password", "/dashboard/settings", KeyRound, "Update your password", 1),
          c("two-factor", "Two-Factor Authentication", "/dashboard/settings", ShieldCheck, "Protect your account with 2FA", 2),
          c("sessions", "Login Sessions", "/dashboard/settings", Users, "Active devices and sessions", 3, { isEnabled: false }),
        ],
      },
      {
        id: "integrations", label: "Integrations", group: "manage",
        route: "/dashboard/manage/integrations", icon: Plug, order: 5,
        description: "Connected platforms and API access.",
        children: [
          c("wordpress", "WordPress", "/dashboard/seo/sites", Globe, "Connected WordPress sites", 1, { tour: "wordpress-connect" }),
          c("social-accounts", "Social Accounts", "/dashboard/social", Share2, "YouTube, TikTok, Instagram and more", 2, { tour: "social-accounts" }),
          c("email-accounts", "Email Accounts", "/dashboard/email/settings", Mail, "Connected inboxes (Email Assistant)", 3),
          c("api-keys", "API Keys", "/dashboard/api", KeyRound, "Developer API access", 4),
        ],
      },
      {
        id: "settings", label: "Settings", group: "manage",
        route: "/dashboard/settings", icon: Settings, order: 6,
        description: "Profile, workspace, branding and support.",
        children: [
          c("profile", "Profile", "/dashboard/settings", Users, "Name, email and account details", 1),
          c("settings-brand", "Brand Kit", "/dashboard/design/brand-kit", Palette, "Your brand identity", 2),
          c("white-label", "Workspace & White Label", "/dashboard/white-label", Briefcase, "Custom branding", 3, { requiredPlan: "agency" }),
          c("tutorials", "Watch Demo & Tutorials", "/dashboard/tutorials", Video, "Walkthrough videos for every feature", 4),
          c("support", "Support", "/dashboard/support", LifeBuoy, "Help center and tickets", 5),
        ],
      },
    ],
  },
];

export const NAV_AREAS: { id: NavAreaId; label: string }[] = DASHBOARD_NAV.map((a) => ({ id: a.id, label: a.label }));

export function getArea(id: NavAreaId): DashNavArea {
  return DASHBOARD_NAV.find((a) => a.id === id)!;
}

/** Section-route redirects: /dashboard/<area>/<section-id> → canonical hub. */
export const SECTION_REDIRECTS: Record<string, string> = {
  "create/content-studio": "/dashboard/studio/content",
  "create/design-studio": "/dashboard/design",
  "create/build-studio": "/dashboard/build",
  "create/publishing-studio": "/dashboard/studio/publishing",
  "grow/marketing-studio": "/dashboard/studio/marketing",
  "grow/automation-studio": "/dashboard/studio/automation",
  "grow/analytics-studio": "/dashboard/studio/analytics",
  "grow/business-studio": "/dashboard/studio/business",
  "manage/billing": "/dashboard/billing",
  "manage/credits": "/dashboard/credits",
  "manage/notifications": "/dashboard/notifications",
  "manage/security": "/dashboard/settings",
  "manage/settings": "/dashboard/settings",
};

/** Global Quick Create menu (available on every dashboard page). */
export const QUICK_CREATE_ITEMS = [
  { label: "Create Video", route: "/dashboard/create?group=video", icon: Video, area: "create" as const },
  { label: "Write SEO Article", route: "/dashboard/seo/new", icon: Search, area: "create" as const },
  { label: "Design Graphic", route: "/dashboard/design/new", icon: Palette, area: "create" as const },
  { label: "Build Website", route: "/dashboard/build/new", icon: Hammer, area: "create" as const },
  { label: "Browser Studio", route: "/dashboard/browser", icon: Globe, area: "create" as const },
  { label: "Create Book", route: "/dashboard/books/new", icon: BookOpen, area: "create" as const },
  { label: "Launch Ad Campaign", route: "/dashboard/ads/create", icon: Megaphone, area: "grow" as const },
  { label: "Run SEO Audit", route: "/dashboard/seo/audit", icon: FileSearch, area: "grow" as const },
  { label: "Generate Leads", route: "/dashboard/leads", icon: Target, area: "grow" as const },
];

/** Dashboard-home quick actions per area (the spec's 12 cards). */
export const HOME_QUICK_ACTIONS: Record<NavAreaId, { label: string; route: string; icon: typeof Video }[]> = {
  create: [
    { label: "Create AI Video", route: "/dashboard/create?group=video", icon: Video },
    { label: "Design Graphic", route: "/dashboard/design/new", icon: Palette },
    { label: "Build Website", route: "/dashboard/build/new", icon: Hammer },
    { label: "Browser Studio", route: "/dashboard/browser", icon: Globe },
    { label: "Write Book", route: "/dashboard/books/new", icon: BookOpen },
  ],
  grow: [
    { label: "Launch Ad Campaign", route: "/dashboard/ads/create", icon: Megaphone },
    { label: "Start Autopilot", route: "/dashboard/autopilot", icon: Rocket },
    { label: "Run SEO Audit", route: "/dashboard/seo/audit", icon: FileSearch },
    { label: "Generate Leads", route: "/dashboard/leads", icon: Target },
  ],
  manage: [
    { label: "View Plan", route: "/dashboard/billing", icon: CreditCard },
    { label: "Top Up Credits", route: "/dashboard/credits", icon: Wallet },
    { label: "Check Notifications", route: "/dashboard/notifications", icon: Bell },
    { label: "Manage Security", route: "/dashboard/settings", icon: ShieldCheck },
  ],
};

/** Plan ladder for lock checks (free < creator < pro < agency). */
const PLAN_RANK: Record<string, number> = { free: 0, creator: 1, pro: 2, agency: 3, enterprise: 4 };

export function planSatisfies(userPlan: string | undefined, required?: "creator" | "pro" | "agency"): boolean {
  if (!required) return true;
  return (PLAN_RANK[userPlan ?? "free"] ?? 0) >= PLAN_RANK[required];
}

/** Flat search index over the whole nav tree (used by global search). */
export type NavSearchEntry = {
  label: string;
  route: string;
  area: NavAreaId;
  areaLabel: string;
  section: string;
  description: string;
};

export function buildNavSearchIndex(): NavSearchEntry[] {
  const out: NavSearchEntry[] = [];
  for (const area of DASHBOARD_NAV) {
    for (const section of area.sections) {
      out.push({
        label: section.label, route: section.route, area: area.id,
        areaLabel: area.label, section: section.label, description: section.description,
      });
      for (const child of section.children) {
        if (child.isEnabled === false) continue;
        out.push({
          label: child.label, route: child.route, area: area.id,
          areaLabel: area.label, section: section.label, description: child.description,
        });
      }
    }
  }
  return out;
}
