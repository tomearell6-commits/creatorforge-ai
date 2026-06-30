"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const ACTION_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  published: "success", generated: "warning", scheduled: "warning",
  approved: "success", paused: "warning", resumed: "success", failed: "danger",
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
              <Badge variant={ACTION_VARIANT[h.action] ?? "default"}>{h.action}</Badge>
              <span className="text-muted-foreground">{h.detail}</span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
