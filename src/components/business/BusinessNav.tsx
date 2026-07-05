"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUSINESS_NAV } from "@/config/businessOps";
import { cn } from "@/lib/utils";

/** Horizontal sub-navigation for the AI Business Operations Manager. */
export function BusinessNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Business Operations" className="-mx-1 overflow-x-auto">
      <div className="flex min-w-max gap-1 border-b border-border px-1">
        {BUSINESS_NAV.map(({ href, label }) => {
          const active = href === "/dashboard/business" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active ? "border-brand-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
