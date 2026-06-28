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
  ShieldCheck,
  KeyRound,
  LifeBuoy,
  Gift,
  Handshake,
  Palette,
  Crown,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

// Grouped navigation: content creation, then the Phase 6 publishing suite.
const NAV_GROUPS: { heading?: string; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
      { href: "/dashboard/projects/new", label: "New Project", icon: PlusCircle },
      { href: "/dashboard/generate", label: "Script Generator", icon: Sparkles },
      { href: "/dashboard/voice", label: "Voice Studio", icon: Mic },
      { href: "/dashboard/scenes", label: "Scene Builder", icon: Clapperboard },
      { href: "/dashboard/thumbnails", label: "Thumbnail Generator", icon: ImageIcon },
      { href: "/dashboard/assets", label: "Asset Library", icon: Library },
      { href: "/dashboard/render", label: "Render Queue", icon: Server },
    ],
  },
  {
    heading: "Publishing",
    items: [
      { href: "/dashboard/publish", label: "Publishing Center", icon: Send },
      { href: "/dashboard/social", label: "Social Accounts", icon: Share2 },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/team", label: "Team Workspace", icon: Users },
      { href: "/dashboard/automation", label: "Automation", icon: Workflow },
      { href: "/dashboard/admin", label: "Admin", icon: ShieldCheck },
    ],
  },
  {
    heading: "Business",
    items: [
      { href: "/dashboard/api", label: "API Center", icon: KeyRound },
      { href: "/dashboard/referrals", label: "Referrals", icon: Gift },
      { href: "/dashboard/affiliate", label: "Affiliate Center", icon: Handshake },
      { href: "/dashboard/white-label", label: "White Label", icon: Palette },
      { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
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
              const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
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
