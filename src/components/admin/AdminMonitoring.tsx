"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Svc = { name: string; status: string; detail: string };

const dot: Record<string, string> = { ok: "bg-green-500", idle: "bg-gray-400", degraded: "bg-amber-500", critical: "bg-red-500" };

export function AdminMonitoring() {
  const [services, setServices] = useState<Svc[]>([]);
  const [alerts, setAlerts] = useState<{ level: string; message: string }[]>([]);
  useEffect(() => {
    fetch("/api/admin/monitoring").then((r) => r.json()).then((j) => { setServices(j.services ?? []); setAlerts(j.alerts ?? []); });
  }, []);

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`rounded-lg border p-3 text-sm ${a.level === "critical" ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}>{a.message}</div>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <Card key={s.name} className="flex items-center gap-3 p-4">
            <span className={`h-3 w-3 rounded-full ${dot[s.status] ?? "bg-gray-400"}`} />
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.detail}</div>
            </div>
            <span className="ml-auto text-xs capitalize text-muted-foreground">{s.status}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
