"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { OpsBadge, OpsProgress, OpsLoading, useOps, fmtDate, fmtNum } from "./ui";

type Quota = {
  id: string; provider_id: string; name: string; quota_type: string; monthly_limit: number | null;
  current_usage: number; reset_date: string | null; computedStatus: string; pct: number | null; remaining: number | null;
};

export function OpsQuotas() {
  const { data, loading, error, reload } = useOps<{ quotas: Quota[] }>("/api/admin/operations/quotas");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ monthlyLimit: "", currentUsage: "", resetDate: "" });
  const [busy, setBusy] = useState(false);

  const save = async (id: string) => {
    setBusy(true);
    try {
      await fetch("/api/admin/operations/quotas", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          monthlyLimit: form.monthlyLimit === "" ? null : Number(form.monthlyLimit),
          currentUsage: form.currentUsage === "" ? 0 : Number(form.currentUsage),
          resetDate: form.resetDate || null,
        }),
      });
      setEditing(null);
      await reload();
    } finally { setBusy(false); }
  };

  if (loading) return <OpsLoading />;
  if (error || !data) return <Alert variant="error">{error ?? "Failed to load"}</Alert>;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Provider</th><th className="px-3 py-2 font-medium">Quota</th>
            <th className="px-3 py-2 font-medium">Limit</th><th className="px-3 py-2 font-medium">Used</th>
            <th className="px-3 py-2 font-medium">Remaining</th><th className="px-3 py-2 font-medium">Usage</th>
            <th className="px-3 py-2 font-medium">Resets</th><th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium"><span className="sr-only">Edit</span></th>
          </tr>
        </thead>
        <tbody>
          {data.quotas.map((q) => (
            <tr key={q.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2.5 font-medium">{q.name}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{q.quota_type.replace(/_/g, " ")}</td>
              {editing === q.id ? (
                <>
                  <td className="px-3 py-2.5"><input value={form.monthlyLimit} onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })} className="h-8 w-24 rounded border border-border bg-background px-2 text-sm" /></td>
                  <td className="px-3 py-2.5"><input value={form.currentUsage} onChange={(e) => setForm({ ...form, currentUsage: e.target.value })} className="h-8 w-24 rounded border border-border bg-background px-2 text-sm" /></td>
                  <td className="px-3 py-2.5 text-muted-foreground">—</td>
                  <td className="px-3 py-2.5 text-muted-foreground">—</td>
                  <td className="px-3 py-2.5"><input type="date" value={form.resetDate} onChange={(e) => setForm({ ...form, resetDate: e.target.value })} className="h-8 rounded border border-border bg-background px-2 text-sm" /></td>
                  <td className="px-3 py-2.5" colSpan={2}>
                    <span className="flex gap-1">
                      <Button size="sm" onClick={() => save(q.id)} disabled={busy}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                    </span>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-3 py-2.5">{fmtNum(q.monthly_limit)}</td>
                  <td className="px-3 py-2.5">{fmtNum(q.current_usage)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{fmtNum(q.remaining)}</td>
                  <td className="px-3 py-2.5"><OpsProgress pct={q.pct} /></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(q.reset_date)}</td>
                  <td className="px-3 py-2.5"><OpsBadge status={q.computedStatus} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(q.id); setForm({ monthlyLimit: q.monthly_limit?.toString() ?? "", currentUsage: q.current_usage?.toString() ?? "", resetDate: q.reset_date ?? "" }); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
