"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

export function ReportsView() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [report, setReport] = useState<any>(null);

  useEffect(() => { fetch(`/api/autopilot/reports?period=${period}`).then((r) => r.json()).then((d) => setReport(d.report)); }, [period]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${period === p ? "border-brand-500 bg-brand-50 font-medium" : "border-border hover:bg-muted"}`}>{p}</button>
        ))}
      </div>

      {!report ? <Card className="text-sm text-muted-foreground">Loading…</Card> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Stat label="Generated" value={report.generated} />
            <Stat label="Published" value={report.published} />
            <Stat label="Failed" value={report.failed} />
            <Stat label="Success rate" value={`${report.successRate}%`} />
            <Stat label="Credits used" value={report.creditsUsed} />
            <Stat label="Credits left" value={report.creditsRemaining} />
          </div>
          <Card>
            <h3 className="font-semibold">Upcoming schedule</h3>
            {report.upcoming.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled.</p> : (
              <ul className="mt-2 space-y-1 text-sm">
                {report.upcoming.map((u: any, i: number) => (
                  <li key={i} className="flex justify-between gap-3"><span className="truncate">{u.title} <span className="text-xs capitalize text-muted-foreground">({(u.destination ?? "").replace(/_/g, " ")})</span></span><span className="text-xs text-muted-foreground">{new Date(u.scheduled_time).toLocaleString()}</span></li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <Card className="p-4"><div className="text-xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div><div className="text-xs text-muted-foreground">{label}</div></Card>;
}
