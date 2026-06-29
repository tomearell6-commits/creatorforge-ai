"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

const ACTION_STYLE: Record<string, string> = {
  published: "bg-brand-100 text-brand-800", generated: "bg-sky-100 text-sky-800", scheduled: "bg-violet-100 text-violet-800",
  approved: "bg-brand-100 text-brand-800", paused: "bg-amber-100 text-amber-800", resumed: "bg-brand-100 text-brand-800", failed: "bg-red-100 text-red-700",
};

export function HistoryView() {
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => { fetch("/api/autopilot/history").then((r) => r.json()).then((d) => setHistory(d.history ?? [])); }, []);

  if (history.length === 0) return <Card className="text-center text-sm text-muted-foreground">No automation activity yet.</Card>;

  return (
    <Card className="p-0">
      <ul className="divide-y divide-border">
        {history.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${ACTION_STYLE[h.action] ?? "bg-muted"}`}>{h.action}</span>
              <span className="text-muted-foreground">{h.detail}</span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
