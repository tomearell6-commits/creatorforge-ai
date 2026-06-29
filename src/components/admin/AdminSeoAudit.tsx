"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";

type Stats = {
  total: number; completed: number; failed: number; creditsConsumed: number; avgScore: number;
  topTypes: { type: string; n: number }[]; commonIssues: { title: string; n: number }[]; auditCredits: number;
};

export function AdminSeoAudit() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { fetch("/api/admin/seo-audit/stats").then((r) => r.json()).then((d) => setS(d.stats)); }, []);
  if (!s) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Audits" value={s.total} />
        <Stat label="Completed" value={s.completed} />
        <Stat label="Failed" value={s.failed} />
        <Stat label="Avg SEO score" value={s.avgScore} />
        <Stat label="Credits consumed" value={s.creditsConsumed} />
        <Stat label="Audit credits (revenue)" value={s.auditCredits} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2">
          <CardTitle className="text-base">Top audit types</CardTitle>
          <Card>
            {s.topTypes.length === 0 ? <p className="text-sm text-muted-foreground">No audits yet.</p> :
              <ul className="space-y-1 text-sm">{s.topTypes.map((t) => <li key={t.type} className="flex justify-between capitalize"><span>{t.type}</span><span className="text-muted-foreground">{t.n}</span></li>)}</ul>}
          </Card>
        </section>
        <section className="space-y-2">
          <CardTitle className="text-base">Most common critical issues</CardTitle>
          <Card>
            {s.commonIssues.length === 0 ? <p className="text-sm text-muted-foreground">No issues recorded yet.</p> :
              <ol className="space-y-1 text-sm">{s.commonIssues.map((i, idx) => <li key={idx} className="flex justify-between gap-3"><span className="truncate">{i.title}</span><span className="text-muted-foreground">{i.n}</span></li>)}</ol>}
          </Card>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><div className="text-xl font-bold">{value.toLocaleString()}</div><div className="text-xs text-muted-foreground">{label}</div></Card>;
}
