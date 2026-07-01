"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Coins,
  Sparkles,
  Send,
  Bot,
  CreditCard,
  Lightbulb,
  LayoutDashboard,
  CalendarClock,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { cn, formatDate } from "@/lib/utils";

type Range = "this" | "last" | "4weeks" | "custom";

type Report = Record<string, unknown>;

const FILTERS: { key: Range; label: string }[] = [
  { key: "this", label: "This week" },
  { key: "last", label: "Last week" },
  { key: "4weeks", label: "Last 4 weeks" },
  { key: "custom", label: "Custom range" },
];

/** Read a numeric metric, tolerating camelCase / snake_case / metrics_json. */
function num(r: Report, ...keys: string[]): number {
  const metrics = (r.metrics_json ?? {}) as Record<string, unknown>;
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k] ?? metrics[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return 0;
}

/** Read a string metric, tolerating camelCase / snake_case / metrics_json. */
function str(r: Report, ...keys: string[]): string | null {
  const metrics = (r.metrics_json ?? {}) as Record<string, unknown>;
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k] ?? metrics[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function recommendations(r: Report): string[] {
  const recs = (r.recommendations ?? r.recommendations_json) as unknown;
  if (Array.isArray(recs)) return recs.filter((x): x is string => typeof x === "string");
  return [];
}

export function WeeklyReport() {
  const [range, setRange] = useState<Range>("this");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (r: Range, s?: string, e?: string) => {
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, string> = { range: r };
        if (r === "custom") {
          if (!s || !e) {
            setError("Please choose both a start and end date.");
            setLoading(false);
            return;
          }
          body.start = s;
          body.end = e;
        }
        const res = await fetch("/api/reports/weekly/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const json = await res.json().catch(() => ({}));
        setReport((json.report ?? null) as Report | null);
      } catch {
        setError("Couldn't generate this report. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load("this");
  }, [load]);

  function selectFilter(next: Range) {
    setRange(next);
    if (next !== "custom") load(next);
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => selectFilter(f.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              range === f.key
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <Card className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="range-start">Start date</Label>
            <Input
              id="range-start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-auto"
            />
          </div>
          <div>
            <Label htmlFor="range-end">End date</Label>
            <Input
              id="range-end"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-auto"
            />
          </div>
          <Button onClick={() => load("custom", start, end)} disabled={loading}>
            Apply
          </Button>
        </Card>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Generating your weekly report" />
        </div>
      ) : report ? (
        <ReportBody report={report} />
      ) : (
        !error && (
          <Card>
            <p className="text-sm text-muted-foreground">No report data for this period.</p>
          </Card>
        )
      )}
    </div>
  );
}

function ReportBody({ report }: { report: Report }) {
  const weekStart = str(report, "weekStart", "week_start");
  const weekEnd = str(report, "weekEnd", "week_end");
  const recs = recommendations(report);

  const booksCreated = num(report, "booksCreated", "books_created");
  const chaptersCreated = num(report, "chaptersCreated", "chapters_created");

  return (
    <div className="space-y-6">
      {(weekStart || weekEnd) && (
        <p className="text-sm text-muted-foreground">
          {weekStart ? formatDate(weekStart) : "—"} — {weekEnd ? formatDate(weekEnd) : "—"}
        </p>
      )}

      {/* Credit Summary */}
      <Card className="space-y-4">
        <SectionHeader icon={<Coins className="h-5 w-5 text-brand-600" />} title="Credit Summary" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Used" value={num(report, "creditsUsed", "credits_used")} />
          <Stat label="Remaining" value={num(report, "creditsRemaining", "credits_remaining")} />
          <Stat label="Purchased" value={num(report, "purchasedCredits", "purchased_credits")} />
          <Stat label="Monthly" value={num(report, "monthlyCredits", "monthly_credits")} />
          <Stat
            label="Est. days remaining"
            value={num(report, "estimatedDaysRemaining", "estimated_days_remaining")}
          />
        </div>
      </Card>

      {/* Content Created */}
      <Card className="space-y-4">
        <SectionHeader icon={<Sparkles className="h-5 w-5 text-brand-600" />} title="Content Created" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Videos" value={num(report, "videosCreated", "videos_created")} />
          <Stat label="SEO articles" value={num(report, "seoArticlesCreated", "seo_articles_created")} />
          <Stat label="Ads" value={num(report, "adsCreated", "ads_created")} />
          <Stat label="Books / chapters" value={`${booksCreated} / ${chaptersCreated}`} />
          <Stat label="Images" value={num(report, "imagesCreated", "images_created")} />
          <Stat label="Voiceovers" value={num(report, "voiceoversCreated", "voiceovers_created")} />
        </div>
      </Card>

      {/* Publishing */}
      <Card className="space-y-4">
        <SectionHeader icon={<Send className="h-5 w-5 text-brand-600" />} title="Publishing" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Published" value={num(report, "postsPublished", "posts_published")} />
          <Stat label="Scheduled" value={num(report, "postsScheduled", "posts_scheduled")} />
          <Stat
            label="Failed"
            value={num(report, "postsFailed", "posts_failed")}
            danger={num(report, "postsFailed", "posts_failed") > 0}
          />
          <Stat label="Upcoming" value={num(report, "upcomingPosts", "upcoming_posts")} />
        </div>
      </Card>

      {/* Automation */}
      <Card className="space-y-4">
        <SectionHeader icon={<Bot className="h-5 w-5 text-brand-600" />} title="Automation" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Active" value={num(report, "automationsActive", "automations_active")} />
          <Stat label="Completed" value={num(report, "automationJobsDone", "automation_jobs_done")} />
          <Stat label="Paused" value={num(report, "automationsPaused", "automations_paused")} />
          <Stat
            label="Failed"
            value={num(report, "automationJobsFailed", "automation_jobs_failed")}
            danger={num(report, "automationJobsFailed", "automation_jobs_failed") > 0}
          />
        </div>
      </Card>

      {/* Billing */}
      <Card className="space-y-4">
        <SectionHeader icon={<CreditCard className="h-5 w-5 text-brand-600" />} title="Billing" />
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="mt-0.5 text-sm font-semibold capitalize">{str(report, "plan") ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1">
              <SubStatusBadge status={str(report, "subscriptionStatus", "subscription_status")} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Renews</p>
            <p className="mt-0.5 text-sm font-semibold">
              {(() => {
                const d = str(report, "renewalDate", "renewal_date");
                return d ? formatDate(d) : "—";
              })()}
            </p>
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      {recs.length > 0 && (
        <Card className="space-y-3">
          <SectionHeader icon={<Lightbulb className="h-5 w-5 text-brand-600" />} title="Recommendations" />
          <div className="rounded-lg bg-brand-50 px-4 py-3 dark:bg-brand-950/30">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-brand-800 dark:text-brand-300">
              {recs.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" /> View Dashboard
          </Link>
        </Button>
        <Button asChild variant="accent">
          <Link href="/dashboard/credits">
            <Coins className="h-4 w-4" /> Top Up Credits
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/billing">
            <CreditCard className="h-4 w-4" /> Manage Subscription
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/calendar">
            <CalendarClock className="h-4 w-4" /> Publishing Calendar
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <CardTitle className="text-base">{title}</CardTitle>
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number | string;
  danger?: boolean;
}) {
  const display = typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className={`text-xl font-bold ${danger ? "text-red-600 dark:text-red-400" : ""}`}>{display}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SubStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-sm text-muted-foreground">—</span>;
  const s = status.toLowerCase();
  const variant =
    s === "active" || s === "trialing"
      ? "success"
      : s === "past_due" || s === "unpaid"
        ? "warning"
        : s === "canceled" || s === "cancelled"
          ? "danger"
          : "default";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}
