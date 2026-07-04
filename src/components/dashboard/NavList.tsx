"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Activity, ChevronDown, ChevronRight, Lock, LayoutDashboard } from "lucide-react";
import { DASHBOARD_NAV, planSatisfies, type DashNavSection } from "@/config/dashboardNavigation";
import { cn } from "@/lib/utils";

/**
 * Create · Grow · Manage sidebar. Areas collapse (persisted in localStorage),
 * sections expand their children when toggled or when the current page lives
 * inside them. Shared by the desktop sidebar and the mobile drawer.
 */

const OPEN_KEY = "cf-nav-open-areas";

const base = (route: string) => route.split("?")[0].split("#")[0];

function sectionContains(section: DashNavSection, pathname: string): boolean {
  if (pathname === base(section.route)) return true;
  return section.children.some((child) => pathname === base(child.route));
}

export function NavList({
  onNavigate,
  isAdmin = false,
  plan = "free",
}: {
  onNavigate?: () => void;
  isAdmin?: boolean;
  plan?: string;
}) {
  const pathname = usePathname();
  const [openAreas, setOpenAreas] = useState<Record<string, boolean>>({ create: true, grow: true, manage: true });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(OPEN_KEY);
      if (stored) setOpenAreas(JSON.parse(stored));
    } catch { /* first visit */ }
  }, []);

  function toggleArea(id: string) {
    setOpenAreas((prev) => {
      const next = { ...prev, [id]: !(prev[id] !== false) };
      try { localStorage.setItem(OPEN_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  }

  return (
    <nav className="flex-1 space-y-3 overflow-y-auto p-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          pathname === "/dashboard"
            ? "bg-brand-600 text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        Dashboard
      </Link>

      {DASHBOARD_NAV.map((area) => {
        const areaOpen = openAreas[area.id] !== false;
        return (
          <div key={area.id}>
            <button
              type="button"
              onClick={() => toggleArea(area.id)}
              aria-expanded={areaOpen}
              className="flex w-full items-center justify-between px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              {area.label}
              {areaOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {areaOpen && (
              <div className="space-y-0.5">
                {area.sections.map((section) => {
                  const inSection = sectionContains(section, pathname);
                  const expanded = openSections[section.id] ?? inSection;
                  const sectionActive = pathname === base(section.route);
                  const Icon = section.icon;
                  return (
                    <div key={section.id}>
                      <div
                        className={cn(
                          "group flex items-center rounded-lg transition-colors",
                          sectionActive ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Link
                          href={section.route}
                          data-tour={section.tour}
                          title={section.description}
                          onClick={onNavigate}
                          className="flex flex-1 items-center gap-3 px-3 py-2 text-sm font-medium"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {section.label}
                        </Link>
                        <button
                          type="button"
                          aria-label={`${expanded ? "Collapse" : "Expand"} ${section.label}`}
                          aria-expanded={expanded}
                          onClick={() => setOpenSections((p) => ({ ...p, [section.id]: !expanded }))}
                          className="mr-1 rounded p-1 opacity-60 hover:opacity-100"
                        >
                          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {expanded && (
                        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
                          {section.children.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive = pathname === base(child.route);
                            if (child.isEnabled === false) {
                              return (
                                <span
                                  key={child.id}
                                  title={`${child.description} — coming soon`}
                                  className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground/50"
                                >
                                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                  {child.label}
                                  <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] font-semibold">Soon</span>
                                </span>
                              );
                            }
                            const locked = !planSatisfies(plan, child.requiredPlan);
                            return (
                              <Link
                                key={child.id}
                                href={locked ? "/dashboard/billing/plans" : child.route}
                                data-tour={child.tour}
                                title={
                                  locked
                                    ? `${child.label} requires the ${child.requiredPlan === "pro" ? "Professional" : "Business"} plan — click to upgrade`
                                    : child.description
                                }
                                onClick={onNavigate}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                                  childActive
                                    ? "bg-brand-500/15 font-semibold text-brand-600"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                {child.label}
                                {locked && <Lock className="ml-auto h-3 w-3 text-amber-500" />}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {isAdmin && (
        <div>
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin</p>
          {[
            { href: "/admin", label: "Admin Portal", icon: Crown },
            { href: "/admin/operations", label: "Operations Review", icon: Activity },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === href ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
