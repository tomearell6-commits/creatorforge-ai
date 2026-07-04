"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BILLING_NAV } from "@/config/billing";
import { cn } from "@/lib/utils";

/** Horizontal sub-navigation shown on every Billing Center page. */
export function BillingNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Billing" className="-mx-1 overflow-x-auto">
      <div className="flex min-w-max gap-1 border-b border-border px-1">
        {BILLING_NAV.map(({ href, label }) => {
          const active = href === "/dashboard/billing" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-brand-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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
