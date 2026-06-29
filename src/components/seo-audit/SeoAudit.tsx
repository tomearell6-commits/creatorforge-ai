"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { SEOAuditForm } from "./SEOAuditForm";
import { SEOAuditProgress } from "./SEOAuditProgress";
import { SEOAuditReport } from "./SEOAuditReport";
import { SEOAuditHistory } from "./SEOAuditHistory";

/** Orchestrates the audit flow: form → running → report, with history. */
export function SeoAudit() {
  const [view, setView] = useState<"form" | "running" | "report">("form");
  const [error, setError] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [fixPlan, setFixPlan] = useState<any>(null);
  const [fixBusy, setFixBusy] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = useCallback(() => {
    fetch("/api/seo-audit/history").then((r) => r.json()).then((d) => setHistory(d.audits ?? []));
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function start(url: string, type: string) {
    setError(null); setView("running");
    try {
      const r = await fetch("/api/seo-audit/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, auditType: type }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Audit failed."); setView("form"); return; }
      setAuditId(d.auditId); setReport(d.report); setIssues(d.report?.issues ?? []); setFixPlan(null);
      setView("report"); loadHistory();
    } catch { setError("Network error. Please try again."); setView("form"); }
  }

  async function openAudit(id: string) {
    setView("running"); setError(null);
    const r = await fetch(`/api/seo-audit/report?id=${id}`);
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Could not load audit."); setView("form"); return; }
    setAuditId(id); setReport(d.report); setIssues(d.issues ?? []); setFixPlan(d.fixPlan ?? null); setView("report");
  }

  async function generateFixPlan() {
    if (!auditId) return;
    setFixBusy(true);
    try {
      const r = await fetch("/api/seo-audit/fix-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auditId }) });
      const d = await r.json();
      if (r.ok) setFixPlan(d.plan);
    } finally { setFixBusy(false); }
  }

  return (
    <div className="space-y-6">
      {view !== "form" && (
        <Button variant="ghost" size="sm" onClick={() => { setView("form"); setError(null); }}><ArrowLeft className="h-4 w-4" /> New audit</Button>
      )}

      {view === "form" && (
        <>
          <SEOAuditForm onStart={start} busy={false} error={error} />
          <SEOAuditHistory audits={history} onOpen={openAudit} />
        </>
      )}
      {view === "running" && <SEOAuditProgress />}
      {view === "report" && report && auditId && (
        <SEOAuditReport auditId={auditId} report={report} issues={issues} fixPlan={fixPlan} onGenerateFixPlan={generateFixPlan} fixBusy={fixBusy} />
      )}
    </div>
  );
}
