"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PLATFORMS } from "@/lib/constants";
import { PlatformIcon } from "@/components/icons/PlatformIcon";

type Data = {
  summary: {
    projects: number; videosCreated: number; videosPublished: number; renders: number;
    creditsConsumed: number; creditsRemaining: number; plan: string; storageBytes: number;
    views: number; engagement: number;
  };
  series: { days: string[]; created: number[]; published: number[] };
  byPlatform: Record<string, number>;
};

function mb(bytes: number) { return (bytes / (1024 * 1024)).toFixed(1) + " MB"; }

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

export function AnalyticsCharts() {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => { fetch("/api/analytics").then((r) => r.json()).then(setD); }, []);
  if (!d) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;

  const max = Math.max(1, ...d.series.created, ...d.series.published);
  const platformMax = Math.max(1, ...Object.values(d.byPlatform));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Projects" value={d.summary.projects} />
        <Stat label="Videos created" value={d.summary.videosCreated} />
        <Stat label="Videos published" value={d.summary.videosPublished} />
        <Stat label="Renders" value={d.summary.renders} />
        <Stat label="Views" value={d.summary.views} />
        <Stat label="Est. engagement" value={d.summary.engagement} />
        <Stat label="Credits consumed" value={d.summary.creditsConsumed} />
        <Stat label="Storage used" value={mb(d.summary.storageBytes)} />
      </div>

      <Card>
        <h3 className="font-semibold">Videos created vs published (14 days)</h3>
        <div className="mt-4 flex h-40 items-end gap-1">
          {d.series.days.map((day, i) => (
            <div key={day} className="flex flex-1 flex-col items-center justify-end gap-0.5" title={day}>
              <div className="flex w-full items-end justify-center gap-0.5" style={{ height: "100%" }}>
                <div className="w-1/2 rounded-t bg-brand-600" style={{ height: `${(d.series.created[i] / max) * 100}%` }} />
                <div className="w-1/2 rounded-t bg-brand-600" style={{ height: `${(d.series.published[i] / max) * 100}%` }} />
              </div>
              <span className="text-[9px] text-muted-foreground">{day.slice(8)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-brand-600" /> Created</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-brand-600" /> Published</span>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">Published by platform</h3>
        <div className="mt-4 space-y-2">
          {Object.keys(d.byPlatform).length === 0 && <p className="text-sm text-muted-foreground">No publishes yet.</p>}
          {Object.entries(d.byPlatform).map(([platform, count]) => {
            const meta = PLATFORMS.find((p) => p.id === platform);
            return (
              <div key={platform} className="flex items-center gap-2 text-sm">
                <span className="flex w-28 items-center gap-1.5"><PlatformIcon platform={platform} className="h-4 w-4" /> {meta?.name ?? platform}</span>
                <div className="h-3 flex-1 rounded bg-muted">
                  <div className="h-3 rounded bg-brand-600" style={{ width: `${(count / platformMax) * 100}%` }} />
                </div>
                <span className="w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">Plan & credits</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Plan: <span className="font-medium capitalize text-foreground">{d.summary.plan}</span> ·
          Credits remaining: <span className="font-medium text-foreground">{d.summary.creditsRemaining}</span>
        </p>
      </Card>
    </div>
  );
}
