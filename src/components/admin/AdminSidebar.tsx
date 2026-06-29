"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, ADMIN_INFRA_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6 font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs text-white">CF</span>
        Admin Portal
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {ADMIN_NAV.map(({ href, label }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn("block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              {label}
            </Link>
          );
        })}

        <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Infrastructure</p>
        {ADMIN_INFRA_NAV.map(({ href, label }) => {
          const active = href === "/admin/infra" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn("block rounded-lg px-3 py-1.5 text-sm transition-colors",
                active ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              {label}
            </Link>
          );
        })}

        <Link href="/dashboard" className="mt-4 block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          ← Back to app
        </Link>
      </nav>
    </aside>
  );
}
