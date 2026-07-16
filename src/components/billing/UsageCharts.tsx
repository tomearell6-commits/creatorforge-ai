"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

type Report = {
  totalCredits90d: number;
  byCategory: { id: string; label: string; credits: number }[];
  daily: { day: string; credits: number }[];
  weekly: { week: string; credits: number }[];
  monthly: { month: string; credits: number }[];
};

type Trend = "daily" | "weekly" | "monthly";

/** Bar chart rendered with plain divs — no chart library, matches the DS. */
function Bars({ points, labelFor }: { points: { key: string; credits: number }[]; labelFor: (k: string) => string }) {
  const max = Math.max(...points.map((p) => p.credits), 1);
  return (
    <div className="flex h-40 items-end gap-1" role="img" aria-label="Credit usage chart">
      {points.map((p) => (
        <div key={p.key} className="group relative flex-1">
          <div
            className={cn("w-full rounded-t bg-brand-500/70 transition-colors group-hover:bg-brand-600", p.credits === 0 && "bg-muted")}
            style={{ height: `${Math.max((p.credits / max) * 100, p.credits > 0 ? 4 : 2)}%` }}
          />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block">
            {labelFor(p.key)}: {p.credits.toLocaleString()} credits
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsageCharts() {
  const [report, setReport] = useState<Report | null>(null);
  const [trend, setTrend] = useState<Trend>("daily");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/usage")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setReport)
      .catch(() => setError("Could not load usage data."));
  }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!report) return <div className="flex justify-center py-12"><Spinner /></div>;

  const points =
    trend === "daily"
      ? report.daily.map((d) => ({ key: d.day, credits: d.credits }))
      : trend === "weekly"
        ? report.weekly.map((w) => ({ key: w.week, credits: w.credits }))
        : report.monthly.map((m) => ({ key: m.month, credits: m.credits }));

  const catMax = Math.max(...report.byCategory.map((c) => c.credits), 1);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Credit usage trends</CardTitle>
            <CardDescription className="mt-1">
              {report.totalCredits90d.toLocaleString()} credits used in the last 90 days.
            </CardDescription>
          </div>
          <div className="flex rounded-lg border border-border p-0.5" role="tablist" aria-label="Trend period">
            {(["daily", "weekly", "monthly"] as Trend[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={trend === t}
                onClick={() => setTrend(t)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold capitalize",
                  trend === t ? "bg-brand-500/15 text-brand-600" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          {points.length === 0 || points.every((p) => p.credits === 0) ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No usage in this period yet — generate something and it shows up here.</p>
          ) : (
            <Bars points={points} labelFor={(k) => k} />
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Usage by category</CardTitle>
        <CardDescription className="mt-1">Where your credits went (last 90 days).</CardDescription>
        {report.byCategory.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No categorised usage yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {report.byCategory.map((c) => (
              <li key={c.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground">{c.credits.toLocaleString()} credits</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${(c.credits / catMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
