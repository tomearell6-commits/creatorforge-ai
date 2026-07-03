"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { OpsBadge, OpsLoading, useOps, fmtDate, fmtMoney } from "./ui";
import { OPS_PROVIDERS } from "@/lib/operations/registry";

type Sub = {
  id: string; provider_id: string; plan_name: string; renewal_date: string | null; billing_cycle: string;
  monthly_cost: number; payment_method: string | null; computedStatus: string; daysRemaining: number | null; notes: string | null;
};

const BLANK = { providerId: OPS_PROVIDERS[0].id, planName: "", renewalDate: "", billingCycle: "monthly", monthlyCost: 0, paymentMethod: "" };

export function OpsSubscriptions() {
  const { data, loading, error, reload } = useOps<{ subscriptions: Sub[] }>("/api/admin/operations/subscriptions");
  const [f, setF] = useState({ ...BLANK });
  const [busy, setBusy] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create");
    try {
      await fetch("/api/admin/operations/subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, renewalDate: f.renewalDate || null }),
      });
      setF({ ...BLANK });
      await reload();
    } finally { setBusy(null); }
  };

  const markRenewed = async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/admin/operations/mark-renewed", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: id }),
      });
      await reload();
    } finally { setBusy(null); }
  };

  if (loading) return <OpsLoading />;
  if (error || !data) return <Alert variant="error">{error ?? "Failed to load"}</Alert>;

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
        <label className="text-xs font-medium text-muted-foreground">Provider
          <select value={f.providerId} onChange={(e) => setF({ ...f, providerId: e.target.value })} className="mt-0.5 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
            {OPS_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">Plan
          <input value={f.planName} onChange={(e) => setF({ ...f, planName: e.target.value })} placeholder="Pro" className="mt-0.5 block h-9 w-28 rounded-md border border-border bg-background px-2 text-sm text-foreground" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">Renewal date
          <input type="date" value={f.renewalDate} onChange={(e) => setF({ ...f, renewalDate: e.target.value })} className="mt-0.5 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">Cycle
          <select value={f.billingCycle} onChange={(e) => setF({ ...f, billingCycle: e.target.value })} className="mt-0.5 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
            <option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="usage">Usage</option><option value="free">Free</option>
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">$/month
          <input type="number" step="0.01" value={f.monthlyCost} onChange={(e) => setF({ ...f, monthlyCost: Number(e.target.value) })} className="mt-0.5 block h-9 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">Payment method
          <input value={f.paymentMethod} onChange={(e) => setF({ ...f, paymentMethod: e.target.value })} placeholder="Visa •• 6411" className="mt-0.5 block h-9 w-32 rounded-md border border-border bg-background px-2 text-sm text-foreground" />
        </label>
        <Button type="submit" size="sm" disabled={busy === "create"}><Plus className="h-4 w-4" /> Add</Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Provider</th><th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Renewal</th><th className="px-3 py-2 font-medium">Days left</th>
              <th className="px-3 py-2 font-medium">Cost</th><th className="px-3 py-2 font-medium">Payment</th>
              <th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {data.subscriptions.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No subscriptions tracked yet — add your paid providers above (Supabase Pro, Vercel, ElevenLabs, etc.).</td></tr>
            )}
            {data.subscriptions.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2.5 font-medium">{OPS_PROVIDERS.find((p) => p.id === s.provider_id)?.name ?? s.provider_id}</td>
                <td className="px-3 py-2.5">{s.plan_name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(s.renewal_date)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.daysRemaining ?? "—"}</td>
                <td className="px-3 py-2.5">{fmtMoney(s.monthly_cost)}{s.billing_cycle === "yearly" ? "/yr" : "/mo"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.payment_method ?? "—"}</td>
                <td className="px-3 py-2.5"><OpsBadge status={s.computedStatus} /></td>
                <td className="px-3 py-2.5 text-right">
                  <Button size="sm" variant="secondary" onClick={() => markRenewed(s.id)} disabled={busy === s.id}><Check className="h-3.5 w-3.5" /> Mark renewed</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
