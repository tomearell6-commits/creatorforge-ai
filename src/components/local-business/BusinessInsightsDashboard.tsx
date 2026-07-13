"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Loc = { id: string; business_name: string };
type Metric = { id: string; label: string; value: number | null; available: boolean };

export function BusinessInsightsDashboard() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [locId, setLocId] = useState("");
  const [own, setOwn] = useState<Metric[]>([]);
  const [gated, setGated] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/local-business/locations").then((r) => r.json()).then((j) => { setLocs(j.locations ?? []); if (j.locations?.[0]) setLocId(j.locations[0].id); }); }, []);
  const load = useCallback(() => {
    if (!locId) return;
    setLoading(true);
    fetch(`/api/local-business/insights?locationId=${locId}`).then((r) => r.json()).then((j) => { setOwn(j.own ?? []); setGated(j.gated ?? []); }).finally(() => setLoading(false));
  }, [locId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <label htmlFor="lb-ins-loc" className="text-sm font-medium">Location</label>
        <select id="lb-ins-loc" value={locId} onChange={(e) => setLocId(e.target.value)} className="mt-1 block h-10 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm">
          {locs.length === 0 && <option value="">No locations</option>}
          {locs.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
        </select>
      </Card>

      {loading ? <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div> : (
        <>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">Available now</h2>
            <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {own.map((m) => (
                <Card key={m.id} className="p-4"><div className="text-2xl font-bold">{m.value ?? "—"}</div><div className="text-xs text-muted-foreground">{m.label}</div></Card>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">Google profile metrics</h2>
            <p className="text-xs text-muted-foreground">These come from Google&rsquo;s Business Profile Performance API — available once your connection is approved. We never fabricate them.</p>
            <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-3">
              {gated.map((m) => (
                <Card key={m.id} className="flex items-center justify-between p-4 opacity-70"><span className="text-sm">{m.label}</span><Badge variant={m.available ? "success" : "warning"}>{m.available ? "live" : "unavailable"}</Badge></Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
