"use client";

import { useEffect, useState } from "react";
import { Gauge, AlertTriangle, Check, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { LB_CREDIT_COSTS, LB_AUDIT_CATEGORIES, scoreStatus } from "@/config/localBusiness";

type Loc = { id: string; business_name: string };
type Scores = Record<string, number>;
type Issue = { severity: string; title: string; detail: string; recommendation: string };
type Report = { summary?: string; sevenDay?: string[]; thirtyDay?: string[]; contentIdeas?: string[] };

export function ProfileAudit() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [locId, setLocId] = useState("");
  const [type, setType] = useState<"quick" | "full">("full");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch("/api/local-business/locations").then((r) => r.json()).then((j) => { setLocs(j.locations ?? []); if (j.locations?.[0]) setLocId(j.locations[0].id); });
  }, []);

  async function run() {
    if (!locId) { setMsg("Add or select a business location first."); return; }
    setBusy(true); setMsg(null); setScores(null); setIssues([]); setReport(null);
    try {
      const res = await fetch("/api/local-business/audit/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: locId, type }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg("Out of credits — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Audit failed."); return; }
      setScores(j.scores);
      const rep = await fetch(`/api/local-business/audit/report?auditId=${j.auditId}`).then((r) => r.json());
      setIssues(rep.issues ?? []); setReport(rep.audit?.report_json ?? null);
      setMsg(`Audit complete (${j.charged} credits).`);
    } finally { setBusy(false); }
  }

  const cost = LB_CREDIT_COSTS[type === "quick" ? "quick_audit" : "full_audit"];
  const st = scores ? scoreStatus(scores.overall) : null;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="lb-audit-loc" className="text-sm font-medium">Business location</label>
            <select id="lb-audit-loc" value={locId} onChange={(e) => setLocId(e.target.value)} className="mt-1 block h-10 rounded-lg border border-border bg-background px-3 text-sm">
              {locs.length === 0 && <option value="">No locations yet</option>}
              {locs.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            {(["quick", "full"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${type === t ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20" : "border-border"}`}>{t} audit</button>
            ))}
          </div>
          <Button onClick={run} disabled={busy}>{busy ? <><Spinner className="h-4 w-4" /> Auditing…</> : <><Gauge className="h-4 w-4" /> Run audit (~{cost} cr)</>}</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Produces a Profile Health / Local Visibility Readiness score (0–100) — not a guaranteed Google ranking.</p>
        {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {scores && st && (
        <>
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold">{scores.overall}</div>
                <div className="text-xs text-muted-foreground">/ 100</div>
              </div>
              <div className="flex-1">
                <Badge variant={st.tone}>{st.label}</Badge>
                {report?.summary && <p className="mt-1 text-sm text-muted-foreground">{report.summary}</p>}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {LB_AUDIT_CATEGORIES.map((c) => (
                <div key={c.id}>
                  <div className="flex justify-between text-xs"><span>{c.label}</span><span className="font-medium">{scores[c.id]}</span></div>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand-600" style={{ width: `${scores[c.id]}%` }} /></div>
                </div>
              ))}
            </div>
          </Card>

          {issues.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold">Issues to fix ({issues.length})</h3>
              <div className="mt-2 space-y-2">
                {issues.map((i, idx) => (
                  <div key={idx} className="flex gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${i.severity === "critical" ? "text-red-500" : "text-amber-500"}`} />
                    <div>
                      <p className="font-medium">{i.title} <Badge variant={i.severity === "critical" ? "danger" : "warning"}>{i.severity}</Badge></p>
                      <p className="text-xs text-muted-foreground">{i.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(report?.sevenDay?.length || report?.thirtyDay?.length) && (
            <div className="grid gap-4 md:grid-cols-2">
              {report?.sevenDay?.length ? (
                <Card className="p-5"><h3 className="text-sm font-semibold">7-day improvement plan</h3><ul className="mt-2 space-y-1 text-sm">{report.sevenDay.map((s, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />{s}</li>)}</ul></Card>
              ) : null}
              {report?.thirtyDay?.length ? (
                <Card className="p-5"><h3 className="text-sm font-semibold">30-day local marketing plan</h3><ul className="mt-2 space-y-1 text-sm">{report.thirtyDay.map((s, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />{s}</li>)}</ul></Card>
              ) : null}
            </div>
          )}

          {report?.contentIdeas?.length ? (
            <Card className="p-5"><h3 className="flex items-center gap-1.5 text-sm font-semibold"><Wand2 className="h-4 w-4 text-brand-600" /> AI content recommendations</h3><div className="mt-2 flex flex-wrap gap-1.5">{report.contentIdeas.map((c, i) => <Badge key={i} variant="default">{c}</Badge>)}</div></Card>
          ) : null}
        </>
      )}
    </div>
  );
}
