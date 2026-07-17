"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2, ShoppingBag, UtensilsCrossed, HeartPulse, GraduationCap, Scale, Landmark,
  HardHat, Car, Sparkles, Plane, CalendarDays, Factory, LayoutGrid, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { INDUSTRY_SUITES } from "@/config/industrySuites";

const ICONS: Record<string, typeof Building2> = {
  Building2, ShoppingBag, UtensilsCrossed, HeartPulse, GraduationCap, Scale, Landmark,
  HardHat, Car, Sparkles, Plane, CalendarDays, Factory, LayoutGrid,
};

/** The Industry Suites hub grid — active suites are clickable, the rest are
 *  visible as "coming soon" so users see the roadmap without clutter. */
export function IndustrySuitesGrid() {
  const [q, setQ] = useState("");
  const suites = useMemo(
    () => INDUSTRY_SUITES.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search industries…"
        aria-label="Search industry suites"
        className="w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-brand-500"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suites.map((s) => {
          const Icon = ICONS[s.icon] ?? LayoutGrid;
          const active = s.status === "active";
          const card = (
            <div
              className={`flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-shadow ${active ? "hover:shadow-md" : "opacity-70"}`}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-900 text-brand-300 dark:bg-brand-950/50 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                {active
                  ? <Badge variant="brand">Available</Badge>
                  : <Badge variant="default">Coming soon</Badge>}
              </div>
              <h3 className="mt-3 font-semibold">{s.name}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{s.description}</p>
              {active && (
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                  Open suite <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </div>
          );
          return active ? (
            <Link key={s.id} href={`/dashboard/design/industries/${s.id}`}>{card}</Link>
          ) : (
            <div key={s.id}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
