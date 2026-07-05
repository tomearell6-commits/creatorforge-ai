"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { REPORT_TYPES } from "@/config/businessOps";

type Report = {
  id: string; report_type: string; period_start: string | null; period_end: string | null;
  report_json: { metrics: Record<string, string | number>; content: { headline: string; narrative: string; wins: string[]; concerns: string[]; nextActions: string[] } };
  created_at: string;
};

export function BusinessReports() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/business/reports").then((r) => (r.ok ? r.json() : null)).then((d) => setReports(d?.reports ?? [])).catch(() => setReports([]));
  }, []);
  useEffect(load, [load]);

  async function generate(type: string) {
    setBusy(type);
    setError(null);
    const res = await fetch("/api/business/reports", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportType: type }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(d.error ?? "Report failed."); return; }
    if (d.report) setOpenId(d.report.id);
    load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Generate a report</CardTitle>
        <CardDescription className="mt-1">
          Built from your real metrics — inquiries, content activity, credits — with AI narrative on top (10 credits).
        </CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          {REPORT_TYPES.map((r) => (
            <Button key={r.id} size="sm" variant="outline" disabled={busy !== null} onClick={() => generate(r.id)}>
              {busy === r.id ? "Generating…" : r.label}
            </Button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </Card>

      {!reports ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : reports.length === 0 ? (
        <EmptyState icon={BarChart3} title="No reports yet" description="Generate your first weekly summary above." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                <div>
                  <span className="font-semibold">{r.report_json.content?.headline || r.report_type}</span>
                  <p className="text-xs text-muted-foreground">
                    {r.period_start} → {r.period_end} · generated {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline">{r.report_type}</Badge>
              </button>
              {openId === r.id && (
                <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
                  <p className="whitespace-pre-line text-muted-foreground">{r.report_json.content?.narrative}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {Object.entries(r.report_json.metrics ?? {}).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-muted/40 p-2">
                        <p className="text-[10px] uppercase text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</p>
                        <p className="font-bold">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                  {(r.report_json.content?.nextActions?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">Next actions</p>
                      <ul className="mt-1 list-inside list-disc">{r.report_json.content.nextActions.map((a) => <li key={a}>{a}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
