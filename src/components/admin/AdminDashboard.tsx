"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Overview = {
  totalUsers: number; activeUsers: number; mrr: number; arr: number;
  activeSubscriptions: number; creditConsumption: number; creditsOutstanding: number;
  renders: number; storageBytes: number; apiRequests: number; activeApiKeys: number;
  published: number; failedJobs: number; openTickets: number; revenueTotal: number;
  planMix: Record<string, number>; alerts: { level: string; message: string }[];
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return <Card className="p-4"><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></Card>;
}

export function AdminDashboard() {
  const [d, setD] = useState<Overview | null>(null);
  useEffect(() => { fetch("/api/admin/overview").then((r) => r.json()).then(setD); }, []);
  if (!d) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      {d.alerts.length > 0 && (
        <div className="space-y-2">
          {d.alerts.map((a, i) => (
            <div key={i} className={`rounded-lg border p-3 text-sm ${a.level === "critical" ? "border-red-300 bg-red-50 text-red-700" : a.level === "warning" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-border bg-muted/40"}`}>
              {a.level === "critical" ? "🔴" : a.level === "warning" ? "⚠️" : "ℹ️"} {a.message}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total users" value={d.totalUsers} />
        <Stat label="Active (30d)" value={d.activeUsers} />
        <Stat label="MRR" value={`$${d.mrr}`} />
        <Stat label="ARR" value={`$${d.arr}`} />
        <Stat label="Active subscriptions" value={d.activeSubscriptions} />
        <Stat label="Revenue (all-time)" value={`$${d.revenueTotal.toFixed(0)}`} />
        <Stat label="Credits consumed" value={d.creditConsumption} />
        <Stat label="Credits outstanding" value={d.creditsOutstanding} />
        <Stat label="Renders" value={d.renders} />
        <Stat label="Published videos" value={d.published} />
        <Stat label="API requests" value={d.apiRequests} />
        <Stat label="Active API keys" value={d.activeApiKeys} />
        <Stat label="Storage" value={`${(d.storageBytes / 1024 ** 2).toFixed(1)} MB`} />
        <Stat label="Failed jobs" value={d.failedJobs} />
        <Stat label="Open tickets" value={d.openTickets} />
      </div>
      <Card>
        <h3 className="font-semibold">Plan mix</h3>
        <div className="mt-3 space-y-1 text-sm">
          {Object.entries(d.planMix).map(([plan, n]) => (
            <div key={plan} className="flex justify-between"><span className="capitalize">{plan}</span><span>{n}</span></div>
          ))}
        </div>
      </Card>
    </div>
  );
}
