"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Activity } from "lucide-react";
import { NAV_GROUPS, type NavGroup } from "./nav-config";
import { cn } from "@/lib/utils";

/** Shown only when the signed-in user passes the platform-admin gate. */
const ADMIN_GROUP: NavGroup = {
  heading: "Admin",
  items: [
    { href: "/admin", label: "Admin Portal", icon: Crown },
    { href: "/admin/operations", label: "Operations Review", icon: Activity },
  ],
};

/** Renders the grouped nav links. Shared by the desktop sidebar + mobile drawer. */
export function NavList({ onNavigate, isAdmin = false }: { onNavigate?: () => void; isAdmin?: boolean }) {
  const pathname = usePathname();
  const groups = isAdmin ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS;
  return (
    <nav className="flex-1 space-y-4 overflow-y-auto p-4">
      {groups.map((group, gi) => (
        <div key={gi} className="space-y-1">
          {group.heading && (
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.heading}
            </p>
          )}
          {group.items.map(({ href, label, icon: Icon, tour }) => {
            const base = href.split("?")[0];
            const active = pathname === base;
            return (
              <Link
                key={`${href}-${label}`}
                href={href}
                data-tour={tour}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
