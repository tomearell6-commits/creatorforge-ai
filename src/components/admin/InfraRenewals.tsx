"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Renewal Center — now backed by the Operations Review layer (single source
 * of truth: operations_providers). Rows with a renewal date sort soonest-first
 * with urgency highlighting; rows without one sort last and can be set INLINE
 * so the table is never a dead end.
 */
type Provider = {
  provider_id: string; name: string; category: string; current_plan: string | null;
  renewal_date: string | null; monthly_cost: number; login_url: string | null;
  configured: boolean | null; daysToRenewal: number | null;
};

const tierOf = (days: number | null): "critical" | "warning" | "upcoming" | "ok" | "unknown" => {
  if (days == null) return "unknown";
  if (days <= 7) return "critical";
  if (days <= 14) return "warning";
  if (days <= 30) return "upcoming";
  return "ok";
};

const TIER: Record<string, string> = {
  critical: "border-l-4 border-red-500", warning: "border-l-4 border-amber-500",
  upcoming: "border-l-4 border-sky-500", ok: "border-l-4 border-transparent", unknown: "border-l-4 border-transparent",
};

export function InfraRenewals() {
  const [rows, setRows] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ renewalDate: "", monthlyCost: "", currentPlan: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/operations/providers", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.ok) {
        const sorted = (json.providers as Provider[]).slice().sort((a, b) => {
          // Dated rows first (soonest renewal on top); undated rows last, alphabetical.
          if (a.renewal_date && b.renewal_date) return a.renewal_date.localeCompare(b.renewal_date);
          if (a.renewal_date) return -1;
          if (b.renewal_date) return 1;
          return a.name.localeCompare(b.name);
        });
        setRows(sorted);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (providerId: string) => {
    setBusy(true);
    try {
      await fetch("/api/admin/operations/providers", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          renewalDate: form.renewalDate || null,
          monthlyCost: form.monthlyCost === "" ? 0 : Number(form.monthlyCost),
          currentPlan: form.currentPlan,
        }),
      });
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner size="sm" /> Loading renewals…</div>;

  const dated = rows.filter((r) => r.renewal_date).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <Legend color="bg-red-500" label="Critical (≤7 days)" />
          <Legend color="bg-amber-500" label="Warning (≤14 days)" />
          <Legend color="bg-sky-500" label="Upcoming (≤30 days)" />
        </div>
        <Link href="/admin/operations/subscriptions" className="text-xs text-brand-600 hover:underline">
          Full subscription manager →
        </Link>
      </div>

      {dated === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          No renewal dates recorded yet — click <strong>Set date</strong> on each paid service (start with your
          domain and Supabase Pro). Once set, rows sort by urgency automatically and the daily cron emails you
          before anything expires.
        </p>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Service</th><th className="p-3">Plan</th><th className="p-3">Renewal date</th><th className="p-3">Days left</th><th className="p-3">Monthly cost</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tier = tierOf(r.daysToRenewal);
              return (
                <tr key={r.provider_id} className={`border-b border-border/50 ${TIER[tier]}`}>
                  <td className="p-3 font-medium">{r.name}</td>
                  {editing === r.provider_id ? (
                    <>
                      <td className="p-3"><input value={form.currentPlan} onChange={(e) => setForm({ ...form, currentPlan: e.target.value })} placeholder="Plan" className="h-8 w-24 rounded border border-border bg-background px-2 text-sm" /></td>
                      <td className="p-3"><input type="date" value={form.renewalDate} onChange={(e) => setForm({ ...form, renewalDate: e.target.value })} className="h-8 rounded border border-border bg-background px-2 text-sm" /></td>
                      <td className="p-3 text-muted-foreground">—</td>
                      <td className="p-3"><input value={form.monthlyCost} onChange={(e) => setForm({ ...form, monthlyCost: e.target.value })} placeholder="$" className="h-8 w-20 rounded border border-border bg-background px-2 text-sm" /></td>
                      <td className="p-3" colSpan={2}>
                        <span className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => save(r.provider_id)} disabled={busy}><Check className="h-3.5 w-3.5" /> Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">{r.current_plan ?? "—"}</td>
                      <td className="p-3">{r.renewal_date ? new Date(r.renewal_date).toLocaleDateString() : "—"}</td>
                      <td className="p-3">{r.daysToRenewal != null ? `${r.daysToRenewal}d` : "—"}</td>
                      <td className="p-3">{r.monthly_cost ? `$${r.monthly_cost}` : "—"}</td>
                      <td className="p-3 capitalize">{r.configured === false ? "Not configured" : tier === "unknown" ? "No date set" : tier === "ok" ? "Healthy" : tier}</td>
                      <td className="p-3">
                        <span className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setEditing(r.provider_id); setForm({ renewalDate: r.renewal_date ?? "", monthlyCost: r.monthly_cost ? String(r.monthly_cost) : "", currentPlan: r.current_plan ?? "" }); }}>
                            <Pencil className="h-3.5 w-3.5" /> {r.renewal_date ? "Edit" : "Set date"}
                          </Button>
                          {r.login_url && (
                            <Button asChild size="sm" variant="ghost">
                              <a href={r.login_url} target="_blank" rel="noopener" title="Renew at the provider"><ExternalLink className="h-3.5 w-3.5" /> Renew</a>
                            </Button>
                          )}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-3 w-3 rounded-sm ${color}`} /> {label}</span>;
}
