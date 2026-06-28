"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Admin = {
  totalUsers: number; activeSubscriptions: number; mrr: number;
  creditsConsumed: number; creditsOutstanding: number; publishedVideos: number;
  failedJobs: number; renders: number; storageBytes: number; apiEvents: number;
  planMix: Record<string, number>; health: string;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

export function AdminAnalytics() {
  const [d, setD] = useState<Admin | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/admin/analytics").then(async (r) => {
      if (!r.ok) { setErr((await r.json()).error ?? "Error"); return; }
      setD(await r.json());
    });
  }, []);

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!d) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total users" value={d.totalUsers} />
        <Stat label="Active subscriptions" value={d.activeSubscriptions} />
        <Stat label="MRR (approx)" value={`$${d.mrr}`} />
        <Stat label="Published videos" value={d.publishedVideos} />
        <Stat label="Renders" value={d.renders} />
        <Stat label="Failed jobs" value={d.failedJobs} />
        <Stat label="Credits consumed" value={d.creditsConsumed} />
        <Stat label="Storage" value={`${(d.storageBytes / (1024 * 1024)).toFixed(1)} MB`} />
        <Stat label="Credits outstanding" value={d.creditsOutstanding} />
        <Stat label="API events" value={d.apiEvents} />
        <Stat label="Platform health" value={d.health} />
      </div>
      <Card>
        <h3 className="font-semibold">Plan mix</h3>
        <div className="mt-3 space-y-1 text-sm">
          {Object.entries(d.planMix).map(([plan, n]) => (
            <div key={plan} className="flex justify-between">
              <span className="capitalize">{plan}</span><span>{n}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
