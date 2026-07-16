"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Provider = {
  id: string; name: string; configured: boolean;
  usage: { calls_today: number; calls_month: number } | null;
};

export function InfraUsage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  useEffect(() => { fetch("/api/admin/infra/providers").then((r) => r.json()).then((d) => setProviders(d.providers ?? [])); }, []);

  const withUsage = providers.filter((p) => p.usage?.calls_month);
  const maxMonth = Math.max(1, ...withUsage.map((p) => p.usage!.calls_month));
  const totalToday = providers.reduce((a, p) => a + (p.usage?.calls_today ?? 0), 0);
  const totalMonth = providers.reduce((a, p) => a + (p.usage?.calls_month ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">API calls today</div><div className="mt-1 text-2xl font-bold">{totalToday.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">API calls this month</div><div className="mt-1 text-2xl font-bold">{totalMonth.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Providers reporting</div><div className="mt-1 text-2xl font-bold">{withUsage.length}</div></Card>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">Monthly API calls by provider</h2>
        {withUsage.length === 0 ? (
          <p className="text-sm text-muted-foreground">No usage snapshots recorded yet. The metrics cron (or admin entry) populates per-provider usage.</p>
        ) : withUsage.map((p) => (
          <div key={p.id}>
            <div className="mb-1 flex justify-between text-sm"><span>{p.name}</span><span className="font-medium">{p.usage!.calls_month.toLocaleString()}</span></div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand-600" style={{ width: `${(p.usage!.calls_month / maxMonth) * 100}%` }} /></div>
          </div>
        ))}
      </Card>

      <p className="text-xs text-muted-foreground">
        Credits consumed/purchased, render/publish/SEO job volumes and response times are also tracked in the platform analytics; this view focuses on external API call volume per provider.
      </p>
    </div>
  );
}
