import {
  LayoutDashboard, FolderKanban, Sparkles, CreditCard, Settings, PlusCircle,
  Mic, Clapperboard, ImageIcon, Library, Server, Send, Share2, CalendarDays,
  BarChart3, Bell, Users, Workflow, KeyRound, LifeBuoy, Gift, Handshake, Palette,
  Crown, ShoppingBag, Video, Music, ListVideo, LayoutTemplate, Wand2, Coins,
  Search, FileText, Globe, CalendarRange,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
export type NavGroup = { heading?: string; items: NavItem[] };

/** Shared content-studio navigation (used by the desktop sidebar + mobile drawer). */
export const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Create",
    items: [
      { href: "/dashboard/projects/new", label: "Create New Video", icon: PlusCircle },
      { href: "/dashboard/projects/new?category=social-captions", label: "AI Shorts", icon: Sparkles },
      { href: "/dashboard/projects/new?category=product-ads", label: "Product Ads", icon: ShoppingBag },
      { href: "/dashboard/render", label: "Image to Video", icon: Video },
      { href: "/dashboard/projects/new?category=motivational", label: "Music Videos", icon: Music },
      { href: "/dashboard/automation", label: "Content Series", icon: ListVideo },
      { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
    ],
  },
  {
    heading: "Studio",
    items: [
      { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
      { href: "/dashboard/generate", label: "Script Generator", icon: Wand2 },
      { href: "/dashboard/voice", label: "Voice Studio", icon: Mic },
      { href: "/dashboard/scenes", label: "Scene Builder", icon: Clapperboard },
      { href: "/dashboard/thumbnails", label: "Thumbnails", icon: ImageIcon },
      { href: "/dashboard/assets", label: "Asset Library", icon: Library },
      { href: "/dashboard/render", label: "Render Queue", icon: Server },
    ],
  },
  {
    heading: "SEO Studio",
    items: [
      { href: "/dashboard/seo", label: "SEO Dashboard", icon: Search },
      { href: "/dashboard/seo/new", label: "New SEO Article", icon: FileText },
      { href: "/dashboard/seo/sites", label: "WordPress Sites", icon: Globe },
      { href: "/dashboard/seo/calendar", label: "Blog Calendar", icon: CalendarRange },
    ],
  },
  {
    heading: "Publishing",
    items: [
      { href: "/dashboard/publish", label: "Publishing Center", icon: Send },
      { href: "/dashboard/social", label: "Social Accounts", icon: Share2 },
      { href: "/dashboard/calendar", label: "Publishing Calendar", icon: CalendarDays },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/team", label: "Team Workspace", icon: Users },
      { href: "/dashboard/automation", label: "Automation", icon: Workflow },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/dashboard/api", label: "API Center", icon: KeyRound },
      { href: "/dashboard/affiliate", label: "Affiliate", icon: Handshake },
      { href: "/dashboard/referrals", label: "Referrals", icon: Gift },
      { href: "/dashboard/white-label", label: "White Label", icon: Palette },
      { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/billing", label: "Credits", icon: Coins },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/admin", label: "Admin Portal", icon: Crown },
    ],
  },
];
