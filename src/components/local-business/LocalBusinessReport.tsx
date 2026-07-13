"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { LB_CREDIT_COSTS } from "@/config/localBusiness";

type Loc = { id: string; business_name: string };
type Report = { id: string; report_type: string; data_json: { summary?: string; recommendations?: string[] }; created_at: string };

export function LocalBusinessReport() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [locId, setLocId] = useState("");
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { fetch("/api/local-business/locations").then((r) => r.json()).then((j) => { setLocs(j.locations ?? []); if (j.locations?.[0]) setLocId(j.locations[0].id); }); }, []);
  const load = useCallback(() => { if (!locId) return; fetch(`/api/local-business/reports?locationId=${locId}`).then((r) => r.json()).then((j) => setReports(j.reports ?? [])); }, [locId]);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    if (!locId) { setMsg("Select a location."); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/local-business/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: locId }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg("Out of credits — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Report failed."); return; }
      setMsg(`Report generated (${j.charged} credits).`); load();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="lb-rep-loc" className="text-sm font-medium">Location</label>
            <select id="lb-rep-loc" value={locId} onChange={(e) => setLocId(e.target.value)} className="mt-1 block h-10 rounded-lg border border-border bg-background px-3 text-sm">
              {locs.length === 0 && <option value="">No locations</option>}
              {locs.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          </div>
          <Button onClick={generate} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />} Generate report (~{LB_CREDIT_COSTS.report} cr)</Button>
        </div>
        {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {reports.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-brand-600" /><h3 className="text-sm font-semibold capitalize">{r.report_type.replace(/_/g, " ")} report</h3><span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span></div>
          {r.data_json?.summary && <p className="mt-2 text-sm">{r.data_json.summary}</p>}
          {r.data_json?.recommendations?.length ? (
            <div className="mt-2"><p className="flex items-center gap-1 text-xs font-semibold text-brand-600"><Sparkles className="h-3.5 w-3.5" /> Recommendations</p><ul className="mt-1 ml-4 list-disc space-y-0.5 text-sm">{r.data_json.recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
