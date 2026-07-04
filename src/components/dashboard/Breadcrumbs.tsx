"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { DASHBOARD_NAV } from "@/config/dashboardNavigation";

type Crumb = { label: string; href?: string };

const base = (route: string) => route.split("?")[0].split("#")[0];

/**
 * Dashboard → Area → Section → Tool, resolved from the navigation config.
 * Pages the config doesn't know fall back to prettified path segments.
 */
function resolveCrumbs(pathname: string): Crumb[] {
  if (pathname === "/dashboard") return [];
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/dashboard" }];

  // Exact child match wins (most specific), then section match, then prefix.
  for (const area of DASHBOARD_NAV) {
    for (const section of area.sections) {
      const child = section.children.find((ch) => base(ch.route) === pathname);
      if (child) {
        crumbs.push({ label: area.label, href: `/dashboard/${area.id}` });
        crumbs.push({ label: section.label, href: base(section.route) === pathname ? undefined : section.route });
        if (base(section.route) !== pathname) crumbs.push({ label: child.label });
        return crumbs;
      }
    }
  }
  for (const area of DASHBOARD_NAV) {
    for (const section of area.sections) {
      if (base(section.route) === pathname) {
        crumbs.push({ label: area.label, href: `/dashboard/${area.id}` });
        crumbs.push({ label: section.label });
        return crumbs;
      }
    }
  }
  // Prefix match: deeper page inside a known section (e.g. an editor).
  let best: { area: string; areaId: string; section: (typeof DASHBOARD_NAV)[0]["sections"][0] } | null = null;
  for (const area of DASHBOARD_NAV) {
    for (const section of area.sections) {
      const route = base(section.route);
      if (route !== "/dashboard/settings" && pathname.startsWith(route + "/")) {
        if (!best || route.length > base(best.section.route).length) {
          best = { area: area.label, areaId: area.id, section };
        }
      }
    }
  }
  const tail = pathname.split("/").filter(Boolean).slice(-1)[0] ?? "";
  const pretty = tail.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  if (best) {
    crumbs.push({ label: best.area, href: `/dashboard/${best.areaId}` });
    crumbs.push({ label: best.section.label, href: best.section.route });
    crumbs.push({ label: pretty });
    return crumbs;
  }
  // Area hubs themselves.
  const area = DASHBOARD_NAV.find((a) => pathname === `/dashboard/${a.id}`);
  if (area) {
    crumbs.push({ label: area.label });
    return crumbs;
  }
  crumbs.push({ label: pretty || "Page" });
  return crumbs;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = resolveCrumbs(pathname);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {crumbs.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
            {c.href ? (
              <Link href={c.href} className="hover:text-foreground hover:underline">
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
