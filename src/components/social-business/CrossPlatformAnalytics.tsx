"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Metric = { id: string; label: string; value: number | null; available: boolean };

export function CrossPlatformAnalytics() {
  const [own, setOwn] = useState<Metric[]>([]);
  const [gated, setGated] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/social-business/analytics").then((r) => r.json()).then((j) => { setOwn(j.own ?? []); setGated(j.gated ?? []); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">Available now</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {own.map((m) => <Card key={m.id} className="p-4"><div className="text-2xl font-bold">{m.value ?? "—"}</div><div className="text-xs text-muted-foreground">{m.label}</div></Card>)}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">Platform metrics</h2>
        <p className="text-xs text-muted-foreground">Reach, impressions, and engagement come from each platform&rsquo;s analytics API — available once that connection is approved. We never fabricate them.</p>
        <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {gated.map((m) => <Card key={m.id} className="flex items-center justify-between p-4 opacity-70"><span className="text-sm">{m.label}</span><Badge variant="warning">unavailable</Badge></Card>)}
        </div>
      </div>
    </div>
  );
}
