"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { SOCIAL_CREDIT_COSTS } from "@/config/socialContentCapabilities";

type Report = { id: string; report_type: string; data_json: { summary?: string; recommendations?: string[] }; created_at: string };
const TYPES = ["weekly", "monthly", "campaign", "platform", "publishing", "content"];

export function SocialReportViewer() {
  const [type, setType] = useState("monthly");
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => { fetch("/api/social-business/reports").then((r) => r.json()).then((j) => setReports(j.reports ?? [])); }, []);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/social-business/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportType: type }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg("Out of credits — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Report failed."); return; }
      setMsg(`Report generated (${j.charged} credits).`); load();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm capitalize">{TYPES.map((t) => <option key={t} value={t}>{t} report</option>)}</select>
          <Button onClick={generate} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />} Generate (~{SOCIAL_CREDIT_COSTS.report} cr)</Button>
        </div>
        {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{msg}</p>}
      </Card>
      {reports.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-brand-600" /><h3 className="text-sm font-semibold capitalize">{r.report_type} report</h3><span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span></div>
          {r.data_json?.summary && <p className="mt-2 text-sm">{r.data_json.summary}</p>}
          {r.data_json?.recommendations?.length ? <div className="mt-2"><p className="flex items-center gap-1 text-xs font-semibold text-brand-600"><Sparkles className="h-3.5 w-3.5" /> Recommendations</p><ul className="mt-1 ml-4 list-disc space-y-0.5 text-sm">{r.data_json.recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul></div> : null}
        </Card>
      ))}
    </div>
  );
}
