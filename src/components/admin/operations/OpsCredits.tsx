"use client";

import { useState } from "react";
import { Check, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { OpsBadge, OpsProgress, OpsLoading, useOps, fmtDate, fmtNum } from "./ui";

type Balance = {
  provider_id: string; name: string; unit: string; current_balance: number | null; monthly_usage: number;
  daily_avg_usage: number; warning_pct: number; critical_pct: number; full_balance: number | null;
  last_topup_at: string | null; topup_url: string | null; notes: string | null;
  computedStatus: string; pct: number | null; estDaysRemaining: number | null;
};

export function OpsCredits() {
  const { data, loading, error, reload } = useOps<{ balances: Balance[] }>("/api/admin/operations/credits");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ currentBalance: "", fullBalance: "", dailyAvgUsage: "", notes: "" });
  const [busy, setBusy] = useState<string | null>(null);

  const startEdit = (b: Balance) => {
    setEditing(b.provider_id);
    setForm({
      currentBalance: b.current_balance?.toString() ?? "", fullBalance: b.full_balance?.toString() ?? "",
      dailyAvgUsage: b.daily_avg_usage?.toString() ?? "", notes: b.notes ?? "",
    });
  };

  const save = async (providerId: string) => {
    setBusy(providerId);
    try {
      await fetch("/api/admin/operations/credits", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          currentBalance: form.currentBalance === "" ? null : Number(form.currentBalance),
          fullBalance: form.fullBalance === "" ? null : Number(form.fullBalance),
          dailyAvgUsage: form.dailyAvgUsage === "" ? 0 : Number(form.dailyAvgUsage),
          notes: form.notes,
        }),
      });
      setEditing(null);
      await reload();
    } finally { setBusy(null); }
  };

  const markTopup = async (providerId: string) => {
    const newBalance = form.currentBalance === "" ? undefined : Number(form.currentBalance);
    setBusy(providerId);
    try {
      await fetch("/api/admin/operations/mark-topup-completed", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, newBalance }),
      });
      setEditing(null);
      await reload();
    } finally { setBusy(null); }
  };

  if (loading) return <OpsLoading />;
  if (error || !data) return <Alert variant="error">{error ?? "Failed to load"}</Alert>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter each provider&apos;s balance after you top up (providers don&apos;t expose balances via API).
        Alerts fire automatically at your warning/critical thresholds and estimate runway from the daily average burn.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {data.balances.map((b) => (
          <div key={b.provider_id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{b.name}</div>
                <div className="text-xs text-muted-foreground">
                  Balance: {fmtNum(b.current_balance)} {b.unit} · Runway: {b.estDaysRemaining != null ? `${b.estDaysRemaining}d` : "—"} · Last top-up: {fmtDate(b.last_topup_at)}
                </div>
              </div>
              <OpsBadge status={b.computedStatus} />
            </div>
            <div className="mt-2"><OpsProgress pct={b.pct} /></div>
            {b.notes && <p className="mt-1 text-xs text-muted-foreground">📝 {b.notes}</p>}

            {editing === b.provider_id ? (
              <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-[11px] font-medium text-muted-foreground">Current balance
                    <input value={form.currentBalance} onChange={(e) => setForm({ ...form, currentBalance: e.target.value })} className="mt-0.5 block h-8 w-full rounded border border-border bg-background px-2 text-sm text-foreground" />
                  </label>
                  <label className="text-[11px] font-medium text-muted-foreground">Full balance (=100%)
                    <input value={form.fullBalance} onChange={(e) => setForm({ ...form, fullBalance: e.target.value })} className="mt-0.5 block h-8 w-full rounded border border-border bg-background px-2 text-sm text-foreground" />
                  </label>
                  <label className="text-[11px] font-medium text-muted-foreground">Daily avg burn
                    <input value={form.dailyAvgUsage} onChange={(e) => setForm({ ...form, dailyAvgUsage: e.target.value })} className="mt-0.5 block h-8 w-full rounded border border-border bg-background px-2 text-sm text-foreground" />
                  </label>
                </div>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Top-up note" className="h-8 w-full rounded border border-border bg-background px-2 text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(b.provider_id)} disabled={busy === b.provider_id}>Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => markTopup(b.provider_id)} disabled={busy === b.provider_id}><Check className="h-3.5 w-3.5" /> Mark top-up completed</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => startEdit(b)}><Pencil className="h-3.5 w-3.5" /> Update</Button>
                {b.topup_url && (
                  <Button asChild size="sm" variant="ghost"><a href={b.topup_url} target="_blank" rel="noopener"><ExternalLink className="h-3.5 w-3.5" /> Top up</a></Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
