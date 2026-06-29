"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Renewal = {
  id: string; name: string; category: string; plan: string | null;
  renewalDate: string | null; daysRemaining: number | null; monthlyCost: number | null; status: string; tier: string;
};

const TIER: Record<string, string> = {
  critical: "border-l-4 border-red-500", warning: "border-l-4 border-amber-500",
  upcoming: "border-l-4 border-sky-500", ok: "border-l-4 border-transparent", unknown: "border-l-4 border-transparent",
};

export function InfraRenewals() {
  const [rows, setRows] = useState<Renewal[]>([]);
  useEffect(() => { fetch("/api/admin/infra/renewals").then((r) => r.json()).then((d) => setRows(d.renewals ?? [])); }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <Legend color="bg-red-500" label="Critical (≤7 days)" />
        <Legend color="bg-amber-500" label="Warning (≤14 days)" />
        <Legend color="bg-sky-500" label="Upcoming (≤30 days)" />
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Service</th><th className="p-3">Plan</th><th className="p-3">Renewal date</th><th className="p-3">Days left</th><th className="p-3">Monthly cost</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No renewal data recorded yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-border/50 ${TIER[r.tier]}`}>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{r.plan ?? "—"}</td>
                <td className="p-3">{r.renewalDate ? new Date(r.renewalDate).toLocaleDateString() : "—"}</td>
                <td className="p-3">{r.daysRemaining != null ? `${r.daysRemaining}d` : "—"}</td>
                <td className="p-3">{r.monthlyCost != null ? `$${r.monthlyCost}` : "—"}</td>
                <td className="p-3 capitalize">{r.status}</td>
                <td className="p-3 text-right"><Button size="sm" variant="outline" disabled title="Renewal handled with the provider">Renew</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-3 w-3 rounded-sm ${color}`} /> {label}</span>;
}
