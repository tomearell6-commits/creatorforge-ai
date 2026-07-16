"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type WeeklyReport = Record<string, unknown> & {
  creditsUsed?: number;
  credits_used?: number;
  videosCreated?: number;
  seoArticlesCreated?: number;
  adsCreated?: number;
  booksCreated?: number;
  imagesCreated?: number;
  voiceoversCreated?: number;
  postsScheduled?: number;
  posts_scheduled?: number;
  failedJobs?: number;
  failed_jobs?: number;
  recommendations?: string[];
  recommendations_json?: string[];
  metrics_json?: Record<string, unknown>;
};

/** Read a numeric metric from a report, tolerating camelCase / snake_case / metrics_json. */
function num(r: WeeklyReport, ...keys: string[]): number {
  const metrics = (r.metrics_json ?? {}) as Record<string, unknown>;
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k] ?? metrics[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return 0;
}

function firstRecommendation(r: WeeklyReport): string | null {
  const recs = (r.recommendations ?? r.recommendations_json) as unknown;
  if (Array.isArray(recs) && recs.length > 0 && typeof recs[0] === "string") return recs[0];
  return null;
}

/** Compact "This week" snapshot for the dashboard home. */
export function WeeklySummaryCard() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/reports/weekly");
        if (!res.ok) throw new Error();
        const json = await res.json().catch(() => ({}));
        if (active) setReport((json.report ?? null) as WeeklyReport | null);
      } catch {
        if (active) setReport(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Card className="flex items-center justify-center py-10">
        <Spinner size="lg" label="Loading your weekly summary" />
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-brand-600" />
          <div>
            <CardTitle className="text-base">This week</CardTitle>
            <p className="text-sm text-muted-foreground">No weekly activity to summarize yet.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/reports/weekly">
            View Full Weekly Report <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </Card>
    );
  }

  const creditsUsed = num(report, "creditsUsed", "credits_used");
  const contentCreated =
    num(report, "videosCreated", "videos_created") +
    num(report, "seoArticlesCreated", "seo_articles_created") +
    num(report, "adsCreated", "ads_created") +
    num(report, "booksCreated", "books_created") +
    num(report, "imagesCreated", "images_created") +
    num(report, "voiceoversCreated", "voiceovers_created");
  const scheduled = num(report, "postsScheduled", "posts_scheduled");
  const failed = num(report, "failedJobs", "failed_jobs");
  const rec = firstRecommendation(report);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-brand-600" />
          <CardTitle className="text-base">This week</CardTitle>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/reports/weekly">
            View Full Weekly Report <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Credits used" value={creditsUsed} />
        <Metric label="Content created" value={contentCreated} />
        <Metric label="Scheduled posts" value={scheduled} />
        <Metric label="Failed jobs" value={failed} danger={failed > 0} />
      </div>

      {rec && (
        <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900 dark:bg-brand-950/30 dark:text-brand-300">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{rec}</span>
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className={`text-xl font-bold ${danger ? "text-red-600 dark:text-red-400" : ""}`}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
