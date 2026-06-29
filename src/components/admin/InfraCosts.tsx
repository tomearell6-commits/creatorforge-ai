"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";

type Row = { id: string; name: string; category: string; daily: number; monthly: number };
type Data = { byProvider: Row[]; totals: { daily: number; monthly: number; forecastMonthly: number }; topDrivers: Row[] };

export function InfraCosts() {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => { fetch("/api/admin/infra/costs").then((r) => r.json()).then(setD); }, []);
  if (!d) return <p className="text-sm text-muted-foreground">Loading costs…</p>;

  const max = Math.max(1, ...d.byProvider.map((r) => r.monthly));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Estimated daily cost</div><div className="mt-1 text-2xl font-bold">${d.totals.daily.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Estimated monthly cost</div><div className="mt-1 text-2xl font-bold">${d.totals.monthly.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Forecasted monthly spend</div><div className="mt-1 text-2xl font-bold">${d.totals.forecastMonthly.toLocaleString()}</div></Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Cost by provider</h2>
          <Button asChild size="sm" variant="outline"><a href="/api/admin/infra/costs?format=csv"><Download className="h-4 w-4" /> Export CSV</a></Button>
        </div>
        {d.byProvider.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cost snapshots recorded yet. Record costs via the metrics cron or admin entry to populate this view.</p>
        ) : d.byProvider.map((r) => (
          <div key={r.id}>
            <div className="mb-1 flex justify-between text-sm"><span>{r.name} <span className="text-xs text-muted-foreground">({r.category})</span></span><span className="font-medium">${r.monthly.toLocaleString()}/mo</span></div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.monthly / max) * 100}%` }} /></div>
          </div>
        ))}
      </Card>

      {d.topDrivers.length > 0 && (
        <Card>
          <h2 className="font-semibold">Top cost drivers</h2>
          <ol className="mt-2 space-y-1 text-sm">
            {d.topDrivers.map((r, i) => <li key={r.id} className="flex justify-between"><span>{i + 1}. {r.name}</span><span className="font-medium">${r.monthly.toLocaleString()}/mo</span></li>)}
          </ol>
        </Card>
      )}
    </div>
  );
}
