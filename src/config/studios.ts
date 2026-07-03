/**
 * Six flagship Studios — the master information architecture for CreatorsForge.
 *
 * Every existing dashboard route belongs to exactly one Studio. This is the single
 * source of truth consumed by the sidebar (nav-config), the Master Dashboard, and
 * each Studio hub page. Reorganizing here reorganizes the whole platform — no
 * routes are removed, only regrouped.
 */
import {
  Video, Megaphone, BookOpen, Workflow, BarChart3, Briefcase,
  LayoutGrid, Image as ImageIcon, Music, Share2, Sparkles, FileText, Clapperboard,
  Library, Server, CalendarDays, FolderKanban, PenLine, FileDown, Palette, LayoutTemplate, Building2,
  Search, Globe, Bell, ListChecks, Rocket, History as HistoryIcon, Users, Wallet,
  CreditCard, KeyRound, Handshake, Gift, LifeBuoy, Crown, Settings, Hash, Type,
  Mail, FileSearch, Target, Hammer,
} from "lucide-react";

export type StudioTool = { label: string; href: string; icon: typeof Video; tour?: string };
export type StudioSection = { heading: string; tools: StudioTool[] };
export type QuickAction = { label: string; href: string; icon: typeof Video };

export type Studio = {
  id: string;
  title: string;
  tagline: string;
  purpose: string;
  icon: typeof Video;
  /** Tailwind classes for the icon chip (kept lime-family for one design language). */
  accent: string;
  quickActions: QuickAction[];
  sections: StudioSection[];
};

export const STUDIOS: Studio[] = [
  {
    id: "content",
    title: "Content Studio",
    tagline: "Create original content with AI.",
    purpose: "Produce videos, voiceovers, images, and written content end to end.",
    icon: Video,
    accent: "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
    quickActions: [
      { label: "Create Video", href: "/dashboard/create?group=video", icon: Video },
      { label: "Design a Graphic", href: "/dashboard/design/new", icon: Palette },
      { label: "Write Blog", href: "/dashboard/generate", icon: FileText },
      { label: "Generate Voiceover", href: "/dashboard/voice", icon: Music },
    ],
    sections: [
      {
        heading: "AI Studios",
        tools: [
          { label: "Create Hub", href: "/dashboard/create", icon: LayoutGrid },
          { label: "AI Video Studio", href: "/dashboard/create?group=video", icon: Video, tour: "ai-video-studio" },
          { label: "AI Design Studio", href: "/dashboard/design", icon: Palette, tour: "create-first-design" },
          { label: "AI Image Studio", href: "/dashboard/create?group=image", icon: ImageIcon },
          { label: "AI Audio & Music Studio", href: "/dashboard/create?group=audio", icon: Music },
          { label: "AI Social Studio", href: "/dashboard/create?group=social", icon: Share2 },
        ],
      },
      {
        heading: "Design Studio",
        tools: [
          { label: "Design Dashboard", href: "/dashboard/design", icon: Palette },
          { label: "Industry Suites", href: "/dashboard/design/industries", icon: Briefcase },
          { label: "Real Estate & Architecture", href: "/dashboard/design/industries/real-estate-architecture", icon: Building2 },
          { label: "New Design", href: "/dashboard/design/new", icon: LayoutGrid },
          { label: "Design Templates", href: "/dashboard/design/templates", icon: LayoutTemplate },
          { label: "Brand Kit", href: "/dashboard/design/brand-kit", icon: Palette },
          { label: "Live AI Footage", href: "/dashboard/design/video-graphics", icon: Clapperboard },
          { label: "Design Exports", href: "/dashboard/design/exports", icon: FileDown },
        ],
      },
      {
        heading: "Tools",
        tools: [
          { label: "Blog & Script Writer", href: "/dashboard/generate", icon: FileText },
          { label: "Thumbnail Generator", href: "/dashboard/thumbnails", icon: ImageIcon },
          { label: "Voiceovers", href: "/dashboard/voice", icon: Music },
          { label: "Scene Builder", href: "/dashboard/scenes", icon: Clapperboard },
          { label: "Viral Hook Generator", href: "/dashboard/tools/viral-hook-generator", icon: Sparkles },
          { label: "Hashtag Generator", href: "/dashboard/tools/hashtag-generator", icon: Hash },
          { label: "YouTube Description", href: "/dashboard/tools/youtube-description", icon: FileText },
        ],
      },
      {
        heading: "Library & History",
        tools: [
          { label: "Template Library", href: "/dashboard/templates", icon: Library, tour: "templates" },
          { label: "Media Library", href: "/dashboard/assets", icon: Library },
          { label: "Render Queue", href: "/dashboard/render", icon: Server, tour: "render-queue" },
          { label: "Content Calendar", href: "/dashboard/calendar", icon: CalendarDays, tour: "publishing-calendar" },
          { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
        ],
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing Studio",
    tagline: "Create and manage marketing campaigns.",
    purpose: "Plan ads across every platform, write sales copy, and track performance.",
    icon: Megaphone,
    accent: "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
    quickActions: [
      { label: "Create Ad", href: "/dashboard/ads/create", icon: Megaphone },
      { label: "Launch Campaign", href: "/dashboard/ads", icon: Rocket },
      { label: "Generate Landing Page", href: "/dashboard/tools/landing-copy", icon: FileText },
      { label: "Create Email Campaign", href: "/dashboard/tools/newsletter", icon: Mail },
    ],
    sections: [
      {
        heading: "Advertising",
        tools: [
          { label: "Campaign Dashboard", href: "/dashboard/ads", icon: Megaphone, tour: "ai-ad-studio" },
          { label: "Create Campaign", href: "/dashboard/ads/create", icon: LayoutGrid },
          { label: "Ad Creative Studio", href: "/dashboard/ads/creative", icon: ImageIcon },
          { label: "Creative Library", href: "/dashboard/ads/library", icon: Library },
          { label: "Connected Ad Accounts", href: "/dashboard/ads/accounts", icon: Share2 },
          { label: "Audience Library", href: "/dashboard/ads/audiences", icon: Users },
        ],
      },
      {
        heading: "Copy & Social",
        tools: [
          { label: "Landing Page Copy", href: "/dashboard/tools/landing-copy", icon: FileText },
          { label: "Sales Copy", href: "/dashboard/tools/product-description", icon: FileText },
          { label: "Email & Newsletter", href: "/dashboard/tools/newsletter", icon: Mail },
          { label: "Meta Title Generator", href: "/dashboard/tools/meta-title-generator", icon: Type },
          { label: "Meta Description Generator", href: "/dashboard/tools/meta-description-generator", icon: Type },
          { label: "Social Accounts", href: "/dashboard/social", icon: Share2, tour: "social-accounts" },
        ],
      },
      {
        heading: "Planning & Reports",
        tools: [
          { label: "Campaign Calendar", href: "/dashboard/ads/calendar", icon: CalendarDays },
          { label: "Campaign Reports", href: "/dashboard/ads/reports", icon: BarChart3 },
          { label: "Ad Settings", href: "/dashboard/ads/settings", icon: Settings },
        ],
      },
    ],
  },
  {
    id: "publishing",
    title: "Publishing Studio",
    tagline: "Write, publish, and promote books.",
    purpose: "Author original books and long-form publications from outline to export.",
    icon: BookOpen,
    accent: "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
    quickActions: [
      { label: "Write New Book", href: "/dashboard/books/new", icon: PenLine },
      { label: "Generate Outline", href: "/dashboard/books/new", icon: ListChecks },
      { label: "Create Cover", href: "/dashboard/books/cover", icon: ImageIcon },
      { label: "Export Book", href: "/dashboard/books/export", icon: FileDown },
    ],
    sections: [
      {
        heading: "Write & Design",
        tools: [
          { label: "Publishing Dashboard", href: "/dashboard/books", icon: BookOpen },
          { label: "My Books", href: "/dashboard/books/library", icon: Library },
          { label: "New Book", href: "/dashboard/books/new", icon: LayoutGrid },
          { label: "Book Templates", href: "/dashboard/books/templates", icon: PenLine },
          { label: "Cover Studio", href: "/dashboard/books/cover", icon: ImageIcon },
        ],
      },
      {
        heading: "Promote & Export",
        tools: [
          { label: "Book Marketing", href: "/dashboard/books/marketing", icon: Megaphone },
          { label: "Export Center", href: "/dashboard/books/export", icon: FileDown },
          { label: "Publishing Tools", href: "/dashboard/publish", icon: Globe },
          { label: "Publishing Settings", href: "/dashboard/books/settings", icon: Settings },
        ],
      },
    ],
  },
  {
    id: "automation",
    title: "Automation Studio",
    tagline: "Automate content creation and publishing.",
    purpose: "Let Autopilot plan, schedule, and publish your content on a recurring basis.",
    icon: Workflow,
    accent: "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
    quickActions: [
      { label: "Enable Autopilot", href: "/dashboard/autopilot", icon: Rocket },
      { label: "Create Automation", href: "/dashboard/automation", icon: Workflow },
      { label: "Schedule Content", href: "/dashboard/autopilot/planner", icon: CalendarDays },
    ],
    sections: [
      {
        heading: "Autopilot",
        tools: [
          { label: "Overview", href: "/dashboard/autopilot", icon: Rocket },
          { label: "Campaigns", href: "/dashboard/autopilot/campaigns", icon: Megaphone },
          { label: "Content Planner", href: "/dashboard/autopilot/planner", icon: CalendarDays },
          { label: "Automation Rules", href: "/dashboard/autopilot/rules", icon: Workflow },
          { label: "Publishing Queue", href: "/dashboard/autopilot/queue", icon: ListChecks },
        ],
      },
      {
        heading: "Operate",
        tools: [
          { label: "Automation Reports", href: "/dashboard/autopilot/reports", icon: BarChart3 },
          { label: "History", href: "/dashboard/autopilot/history", icon: HistoryIcon },
          { label: "Autopilot Settings", href: "/dashboard/autopilot/settings", icon: Settings },
          { label: "Automation Flows", href: "/dashboard/automation", icon: Workflow },
          { label: "WordPress Publishing", href: "/dashboard/seo/sites", icon: Globe, tour: "wordpress-connect" },
          { label: "Notification Center", href: "/dashboard/notifications", icon: Bell },
        ],
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics Studio",
    tagline: "Measure and improve performance.",
    purpose: "Audit websites, track SEO and campaigns, and watch your growth metrics.",
    icon: BarChart3,
    accent: "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
    quickActions: [
      { label: "Run Website Audit", href: "/dashboard/seo/audit", icon: FileSearch },
      { label: "Generate SEO Report", href: "/dashboard/seo", icon: Search },
      { label: "View Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    ],
    sections: [
      {
        heading: "Audits & SEO",
        tools: [
          { label: "SEO Dashboard", href: "/dashboard/seo", icon: Search, tour: "seo-studio" },
          { label: "SEO Audit", href: "/dashboard/seo/audit", icon: FileSearch },
          { label: "New Audit", href: "/dashboard/seo/new", icon: LayoutGrid },
          { label: "SEO Calendar", href: "/dashboard/seo/calendar", icon: CalendarDays },
        ],
      },
      {
        heading: "Performance & Usage",
        tools: [
          { label: "Analytics Dashboard", href: "/dashboard/analytics", icon: BarChart3 },
          { label: "Credit Usage", href: "/dashboard/credits", icon: Wallet, tour: "credit-topup" },
          { label: "API Usage", href: "/dashboard/api", icon: KeyRound },
        ],
      },
    ],
  },
  {
    id: "business",
    title: "Business Studio",
    tagline: "Manage the business behind CreatorsForge.",
    purpose: "Brand, team, billing, integrations, and infrastructure in one place.",
    icon: Briefcase,
    accent: "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
    quickActions: [
      { label: "Top Up Credits", href: "/dashboard/credits", icon: Wallet },
      { label: "Invite Team", href: "/dashboard/team", icon: Users },
      { label: "Manage Brand", href: "/dashboard/white-label", icon: Palette },
      { label: "View Infrastructure", href: "/admin/infra/health", icon: Server },
    ],
    sections: [
      {
        heading: "Build Studio",
        tools: [
          { label: "Build Dashboard", href: "/dashboard/build", icon: Hammer },
          { label: "New Build Project", href: "/dashboard/build/new", icon: LayoutGrid },
          { label: "Build Templates", href: "/dashboard/build/templates", icon: LayoutTemplate },
          { label: "My Build Projects", href: "/dashboard/build/projects", icon: FolderKanban },
        ],
      },
      {
        heading: "AI Email Assistant",
        tools: [
          { label: "Email Dashboard", href: "/dashboard/email", icon: Mail },
          { label: "Connect Email", href: "/dashboard/email/connect", icon: KeyRound },
          { label: "Needs Attention", href: "/dashboard/email/needs-attention", icon: Bell },
          { label: "Draft Replies", href: "/dashboard/email/drafts", icon: PenLine },
          { label: "Automation Rules", href: "/dashboard/email/rules", icon: Workflow },
          { label: "Email Reports", href: "/dashboard/email/reports", icon: BarChart3 },
        ],
      },
      {
        heading: "Brand & Team",
        tools: [
          { label: "Brand Kit / White Label", href: "/dashboard/white-label", icon: Palette },
          { label: "Team Workspace", href: "/dashboard/team", icon: Users },
          { label: "Affiliate Program", href: "/dashboard/affiliate", icon: Handshake },
          { label: "Referral Program", href: "/dashboard/referrals", icon: Gift },
        ],
      },
      {
        heading: "Billing & Account",
        tools: [
          { label: "Credit Wallet", href: "/dashboard/credits", icon: Wallet },
          { label: "Billing & Subscription", href: "/dashboard/billing", icon: CreditCard },
          { label: "API Center", href: "/dashboard/api", icon: KeyRound },
          { label: "Settings", href: "/dashboard/settings", icon: Settings },
        ],
      },
      {
        heading: "Lead Generator",
        tools: [
          { label: "Lead Dashboard", href: "/dashboard/leads", icon: Target },
          { label: "New Lead Search", href: "/dashboard/leads/search", icon: Search },
          { label: "Lead Lists", href: "/dashboard/leads/lists", icon: ListChecks },
          { label: "Email Verification", href: "/dashboard/leads/verification", icon: FileSearch },
          { label: "Outreach Templates", href: "/dashboard/leads/templates", icon: FileText },
          { label: "Brevo Campaigns", href: "/dashboard/leads/campaigns", icon: Mail },
          { label: "Lead Reports", href: "/dashboard/leads/reports", icon: BarChart3 },
          { label: "Lead Settings", href: "/dashboard/leads/settings", icon: Settings },
        ],
      },
      {
        heading: "Operations & Support",
        tools: [
          { label: "Support Center", href: "/dashboard/support", icon: LifeBuoy },
          { label: "Infrastructure Operations", href: "/admin/infra/health", icon: Server },
          { label: "Admin Portal", href: "/admin", icon: Crown },
        ],
      },
    ],
  },
];

export const getStudio = (id: string): Studio | undefined => STUDIOS.find((s) => s.id === id);
export const studioToolCount = (s: Studio): number => s.sections.reduce((n, sec) => n + sec.tools.length, 0);
