"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Input, Label } from "@/components/ui/Input";

type DbPlan = {
  id: string; name: string; tagline: string | null; monthly_price: number; annual_price: number | null;
  credits: number; is_custom: boolean; is_active: boolean; badge: string | null;
};
type Coupon = {
  id: string; code: string; description: string | null; kind: string; value: number;
  is_active: boolean; max_uses: number | null; used_count: number; expires_at: string | null;
};
type Revenue = {
  totals: { allTimeTopupsUsd: number; last30dTopupsUsd: number; invoicedLast30dUsd: number; failedPayments: number };
  invoices: { invoice_number: string; invoice_date: string; description: string; amount_usd: number; status: string; payment_method: string }[];
  failedPayments: { created_at: string; description: string }[];
  topups: { created_at: string; credits: number; usd_amount: number; status: string }[];
};

/** Admin Portal → Billing & Plans: plan editor, coupons, revenue. */
export function AdminBillingCenter() {
  const [plans, setPlans] = useState<DbPlan[] | null>(null);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [editing, setEditing] = useState<DbPlan | null>(null);
  const [newCoupon, setNewCoupon] = useState({ code: "", value: 10, kind: "bonus_credits_pct" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/billing/plans").then((r) => r.json()).then((d) => setPlans(d.plans ?? [])).catch(() => setPlans([]));
    fetch("/api/admin/billing/coupons").then((r) => r.json()).then((d) => setCoupons(d.coupons ?? [])).catch(() => setCoupons([]));
    fetch("/api/admin/billing/revenue").then((r) => r.json()).then((d) => setRevenue(d.totals ? d : null)).catch(() => {});
  }, []);

  useEffect(load, [load]);

  async function savePlan() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/billing/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(d.error ?? "Save failed."); return; }
    setEditing(null);
    load();
  }

  async function togglePlan(p: DbPlan) {
    await fetch("/api/admin/billing/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
    });
    load();
  }

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/billing/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCoupon),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.error ?? "Could not create coupon."); return; }
    setNewCoupon({ code: "", value: 10, kind: "bonus_credits_pct" });
    load();
  }

  async function toggleCoupon(c: Coupon) {
    await fetch("/api/admin/billing/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, is_active: !c.is_active }),
    });
    load();
  }

  if (!plans) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-6">
      {/* Revenue */}
      {revenue && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card><CardDescription>Top-ups (all time)</CardDescription><p className="mt-1 text-2xl font-bold">${revenue.totals.allTimeTopupsUsd.toFixed(2)}</p></Card>
          <Card><CardDescription>Top-ups (30 days)</CardDescription><p className="mt-1 text-2xl font-bold">${revenue.totals.last30dTopupsUsd.toFixed(2)}</p></Card>
          <Card><CardDescription>Invoiced (30 days)</CardDescription><p className="mt-1 text-2xl font-bold">${revenue.totals.invoicedLast30dUsd.toFixed(2)}</p></Card>
          <Card><CardDescription>Failed payments</CardDescription><p className={`mt-1 text-2xl font-bold ${revenue.totals.failedPayments > 0 ? "text-red-500" : ""}`}>{revenue.totals.failedPayments}</p></Card>
        </div>
      )}

      {/* Plans */}
      <Card>
        <CardTitle>Subscription plans</CardTitle>
        <CardDescription className="mt-1">
          Reprice, rename, badge, or disable plans — live immediately, no deploy. Plan IDs are fixed.
        </CardDescription>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 font-semibold">Plan</th>
                <th className="py-2 pr-3 font-semibold">Monthly</th>
                <th className="py-2 pr-3 font-semibold">Annual</th>
                <th className="py-2 pr-3 font-semibold">Credits</th>
                <th className="py-2 pr-3 font-semibold">Badge</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{p.name} <span className="text-xs text-muted-foreground">({p.id})</span></td>
                  <td className="py-2.5 pr-3">{p.is_custom ? "Custom" : `$${Number(p.monthly_price)}`}</td>
                  <td className="py-2.5 pr-3">{p.annual_price != null ? `$${Number(p.annual_price)}` : "—"}</td>
                  <td className="py-2.5 pr-3">{p.credits.toLocaleString()}</td>
                  <td className="py-2.5 pr-3">{p.badge ?? "—"}</td>
                  <td className="py-2.5 pr-3"><Badge variant={p.is_active ? "success" : "default"}>{p.is_active ? "Active" : "Disabled"}</Badge></td>
                  <td className="py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ ...p })}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => togglePlan(p)}>{p.is_active ? "Disable" : "Enable"}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <form
            className="mt-4 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e) => { e.preventDefault(); savePlan(); }}
          >
            <div className="sm:col-span-2 lg:col-span-3 text-sm font-semibold">Editing “{editing.name}” ({editing.id})</div>
            <div><Label htmlFor="ep-name">Name</Label><Input id="ep-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label htmlFor="ep-price">Monthly price (USD)</Label><Input id="ep-price" type="number" min={0} step="0.01" value={editing.monthly_price} onChange={(e) => setEditing({ ...editing, monthly_price: Number(e.target.value) })} /></div>
            <div><Label htmlFor="ep-annual">Annual price (USD)</Label><Input id="ep-annual" type="number" min={0} step="0.01" value={editing.annual_price ?? ""} onChange={(e) => setEditing({ ...editing, annual_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
            <div><Label htmlFor="ep-credits">Monthly credits</Label><Input id="ep-credits" type="number" min={0} value={editing.credits} onChange={(e) => setEditing({ ...editing, credits: Number(e.target.value) })} /></div>
            <div><Label htmlFor="ep-badge">Badge</Label><Input id="ep-badge" value={editing.badge ?? ""} placeholder="Most Popular / Recommended / empty" onChange={(e) => setEditing({ ...editing, badge: e.target.value || null })} /></div>
            <div><Label htmlFor="ep-tagline">Tagline</Label><Input id="ep-tagline" value={editing.tagline ?? ""} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} /></div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save plan"}</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        )}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </Card>

      {/* Coupons */}
      <Card>
        <CardTitle>Coupons</CardTitle>
        <CardDescription className="mt-1">Bonus-credit promo codes (validated server-side at top-up).</CardDescription>
        <form onSubmit={createCoupon} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="cp-code">Code</Label>
            <Input id="cp-code" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} placeholder="LAUNCH20" required />
          </div>
          <div>
            <Label htmlFor="cp-kind">Type</Label>
            <select
              id="cp-kind"
              value={newCoupon.kind}
              onChange={(e) => setNewCoupon({ ...newCoupon, kind: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="bonus_credits_pct">Bonus credits (%)</option>
              <option value="bonus_credits_flat">Bonus credits (flat)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="cp-value">Value</Label>
            <Input id="cp-value" type="number" min={1} value={newCoupon.value} onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })} required />
          </div>
          <Button type="submit">Create coupon</Button>
        </form>
        {coupons && coupons.length > 0 && (
          <ul className="mt-4 divide-y divide-border">
            {coupons.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <span className="font-mono font-semibold">{c.code}</span>{" "}
                  <span className="text-muted-foreground">
                    {c.kind === "bonus_credits_pct" ? `+${c.value}% bonus credits` : `+${c.value} bonus credits`} · used {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.is_active ? "success" : "default"}>{c.is_active ? "Active" : "Off"}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => toggleCoupon(c)}>{c.is_active ? "Deactivate" : "Activate"}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Recent activity */}
      {revenue && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle>Recent invoices</CardTitle>
            <ul className="mt-3 divide-y divide-border text-sm">
              {revenue.invoices.slice(0, 8).map((i) => (
                <li key={i.invoice_number} className="flex justify-between gap-2 py-2">
                  <span className="truncate">{i.invoice_number} · {i.description}</span>
                  <span className="whitespace-nowrap font-semibold">${Number(i.amount_usd).toFixed(2)}</span>
                </li>
              ))}
              {revenue.invoices.length === 0 && <li className="py-2 text-muted-foreground">No invoices yet.</li>}
            </ul>
          </Card>
          <Card>
            <CardTitle>Recent top-ups</CardTitle>
            <ul className="mt-3 divide-y divide-border text-sm">
              {revenue.topups.slice(0, 8).map((t, i) => (
                <li key={i} className="flex justify-between gap-2 py-2">
                  <span>{new Date(t.created_at).toLocaleDateString()} · {t.credits.toLocaleString()} credits · {t.status}</span>
                  <span className="whitespace-nowrap font-semibold">${Number(t.usd_amount).toFixed(2)}</span>
                </li>
              ))}
              {revenue.topups.length === 0 && <li className="py-2 text-muted-foreground">No top-ups yet.</li>}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
