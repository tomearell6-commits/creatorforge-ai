import {
  LayoutDashboard, FolderKanban, CreditCard, Settings, Server, Share2, CalendarDays,
  BarChart3, Bell, Users, Workflow, KeyRound, LifeBuoy, Gift, Handshake, Palette,
  Crown, Video, Music, LayoutTemplate, Search, Globe, Library, Megaphone, Image as ImageIcon,
  LayoutGrid, Wallet,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
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
      { href: "/dashboard/create?group=video", label: "AI Video Studio", icon: Video },
      { href: "/dashboard/create?group=ad", label: "AI Ad Studio", icon: Megaphone },
      { href: "/dashboard/create?group=image", label: "AI Image Studio", icon: ImageIcon },
      { href: "/dashboard/create?group=seo", label: "AI SEO Studio", icon: Search },
      { href: "/dashboard/create?group=social", label: "AI Social Studio", icon: Share2 },
      { href: "/dashboard/create?group=audio", label: "AI Audio & Music Studio", icon: Music },
      { href: "/dashboard/create?group=automation", label: "AI Automation Studio", icon: Workflow },
    ],
  },
  {
    heading: "Management",
    items: [
      { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
      { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
      { href: "/dashboard/assets", label: "Media Library", icon: Library },
      { href: "/dashboard/render", label: "Render Queue", icon: Server },
      { href: "/dashboard/calendar", label: "Publishing Calendar", icon: CalendarDays },
      { href: "/dashboard/seo", label: "SEO Dashboard", icon: Search },
      { href: "/dashboard/seo/sites", label: "WordPress Sites", icon: Globe },
      { href: "/dashboard/social", label: "Social Accounts", icon: Share2 },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/credits", label: "Credit Wallet", icon: Wallet },
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
