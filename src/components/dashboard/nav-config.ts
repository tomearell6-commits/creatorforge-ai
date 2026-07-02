import { LayoutDashboard, LayoutTemplate, FolderKanban, Settings, LifeBuoy, Palette } from "lucide-react";
import { STUDIOS } from "@/config/studios";

export type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; tour?: string };
export type NavGroup = { heading?: string; items: NavItem[] };

/**
 * Sidebar navigation for the AI Business Operating System. Intentionally lean:
 * Dashboard → the six flagship Studios → workspace shortcuts. Each Studio link
 * opens its hub (/dashboard/studio/<id>), where all of that Studio's tools live.
 * The Studio list is derived from the single STUDIOS source of truth, so adding a
 * tool there never means editing the sidebar.
 */
export const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Studios",
    items: STUDIOS.map((s) => ({ href: `/dashboard/studio/${s.id}`, label: s.title, icon: s.icon })),
  },
  {
    heading: "Workspace",
    items: [
      { href: "/dashboard/design", label: "Design Studio", icon: Palette, tour: "create-first-design" },
      { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate, tour: "templates" },
      { href: "/dashboard/projects", label: "Recent Projects", icon: FolderKanban },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/support", label: "Help Center", icon: LifeBuoy },
    ],
  },
];
