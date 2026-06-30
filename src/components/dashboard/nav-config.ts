import {
  LayoutDashboard, FolderKanban, CreditCard, Settings, Server, Share2, CalendarDays,
  BarChart3, Bell, Users, Workflow, KeyRound, LifeBuoy, Gift, Handshake, Palette,
  Crown, Video, Music, LayoutTemplate, Search, Globe, Library, Megaphone, Image as ImageIcon,
  LayoutGrid, Wallet, Rocket, ListChecks, History as HistoryIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; tour?: string };
export type NavGroup = { heading?: string; items: NavItem[] };

/**
 * Unified content-studio navigation. "Create Content" mirrors the 7 studios from
 * the homepage (via the central category config / Create hub). Nothing the
 * homepage shows is missing here.
 */
export const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Create Content",
    items: [
      { href: "/dashboard/create", label: "Create Hub", icon: LayoutGrid },
      { href: "/dashboard/create?group=video", label: "AI Video Studio", icon: Video, tour: "ai-video-studio" },
      { href: "/dashboard/create?group=ad", label: "AI Ad Studio", icon: Megaphone, tour: "ai-ad-studio" },
      { href: "/dashboard/create?group=image", label: "AI Image Studio", icon: ImageIcon },
      { href: "/dashboard/create?group=seo", label: "AI SEO Studio", icon: Search },
      { href: "/dashboard/create?group=social", label: "AI Social Studio", icon: Share2 },
      { href: "/dashboard/create?group=audio", label: "AI Audio & Music Studio", icon: Music },
      { href: "/dashboard/create?group=automation", label: "AI Automation Studio", icon: Workflow },
    ],
  },
  {
    heading: "CreatorForge Autopilot",
    items: [
      { href: "/dashboard/autopilot", label: "Overview", icon: Rocket },
      { href: "/dashboard/autopilot/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/dashboard/autopilot/planner", label: "Planner", icon: CalendarDays },
      { href: "/dashboard/autopilot/rules", label: "Automation Rules", icon: Workflow },
      { href: "/dashboard/autopilot/queue", label: "Publishing Queue", icon: ListChecks },
      { href: "/dashboard/autopilot/reports", label: "Reports", icon: BarChart3 },
      { href: "/dashboard/autopilot/history", label: "History", icon: HistoryIcon },
      { href: "/dashboard/autopilot/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    heading: "AI Advertising Studio",
    items: [
      { href: "/dashboard/ads", label: "Campaign Dashboard", icon: Megaphone },
      { href: "/dashboard/ads/create", label: "Create Campaign", icon: LayoutGrid },
      { href: "/dashboard/ads/creative", label: "Ad Creative Studio", icon: ImageIcon },
      { href: "/dashboard/ads/library", label: "Creative Library", icon: Library },
      { href: "/dashboard/ads/accounts", label: "Connected Ad Accounts", icon: Share2 },
      { href: "/dashboard/ads/calendar", label: "Campaign Calendar", icon: CalendarDays },
      { href: "/dashboard/ads/reports", label: "Campaign Reports", icon: BarChart3 },
      { href: "/dashboard/ads/audiences", label: "Audience Library", icon: Users },
      { href: "/dashboard/ads/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    heading: "Management",
    items: [
      { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
      { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate, tour: "templates" },
      { href: "/dashboard/assets", label: "Media Library", icon: Library },
      { href: "/dashboard/render", label: "Render Queue", icon: Server, tour: "render-queue" },
      { href: "/dashboard/calendar", label: "Publishing Calendar", icon: CalendarDays, tour: "publishing-calendar" },
      { href: "/dashboard/seo", label: "SEO Dashboard", icon: Search, tour: "seo-studio" },
      { href: "/dashboard/seo/sites", label: "WordPress Sites", icon: Globe, tour: "wordpress-connect" },
      { href: "/dashboard/social", label: "Social Accounts", icon: Share2, tour: "social-accounts" },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/credits", label: "Credit Wallet", icon: Wallet, tour: "credit-topup" },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    heading: "More",
    items: [
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/team", label: "Team Workspace", icon: Users },
      { href: "/dashboard/automation", label: "Automation", icon: Workflow },
      { href: "/dashboard/api", label: "API Center", icon: KeyRound },
      { href: "/dashboard/affiliate", label: "Affiliate", icon: Handshake },
      { href: "/dashboard/referrals", label: "Referrals", icon: Gift },
      { href: "/dashboard/white-label", label: "White Label", icon: Palette },
      { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
      { href: "/admin", label: "Admin Portal", icon: Crown },
    ],
  },
];
