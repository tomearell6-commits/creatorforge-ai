"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  CreditCard,
  Settings,
  PlusCircle,
  Mic,
  Clapperboard,
  ImageIcon,
  Library,
  Server,
  Send,
  Share2,
  CalendarDays,
  BarChart3,
  Bell,
  Users,
  Workflow,
  KeyRound,
  LifeBuoy,
  Gift,
  Handshake,
  Palette,
  Crown,
  ShoppingBag,
  Video,
  Music,
  ListVideo,
  LayoutTemplate,
  Wand2,
  Coins,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

// Content-studio navigation: Create entry points → Studio tools → Publishing → Account.
const NAV_GROUPS: { heading?: string; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
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
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Logo href="/dashboard" />
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.heading && (
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.heading}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const base = href.split("?")[0];
              const active = base === "/dashboard" ? pathname === base : pathname === base;
              return (
                <Link
                  key={`${href}-${label}`}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-600 text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
