"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

type Pkg = { id: string; slug: string; name: string; usd_price: number; credits: number; bonus: number; sort_order: number; is_active: boolean };
type Stats = { revenueUsd: number; creditsSold: number; completedPurchases: number; totalPurchaseAttempts: number; paymentRequests: number; conversionRate: number };

export function AdminWallet() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadPackages() {
    const r = await fetch("/api/admin/wallet/packages");
    const d = await r.json();
    setPackages(d.packages ?? []);
  }
  useEffect(() => {
    fetch("/api/admin/wallet/stats").then((r) => r.json()).then((d) => setStats(d.stats));
    loadPackages();
  }, []);

  async function pkgAction(body: Record<string, unknown>) {
    setMsg(null);
    const r = await fetch("/api/admin/wallet/packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) setMsg(d.error || "Failed."); else { setMsg("Saved ✓"); loadPackages(); }
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Revenue" value={stats ? `$${stats.revenueUsd.toLocaleString()}` : "…"} />
        <Stat label="Credits sold" value={stats ? stats.creditsSold.toLocaleString() : "…"} />
        <Stat label="Completed" value={stats ? String(stats.completedPurchases) : "…"} />
        <Stat label="Attempts" value={stats ? String(stats.totalPurchaseAttempts) : "…"} />
        <Stat label="Payment reqs" value={stats ? String(stats.paymentRequests) : "…"} />
        <Stat label="Conversion" value={stats ? `${stats.conversionRate}%` : "…"} />
      </div>

      {msg && <p className="text-sm text-brand-700">{msg}</p>}

      {/* Packages */}
      <section className="space-y-3">
        <CardTitle className="text-base">Credit Packages</CardTitle>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="p-3">Name</th><th className="p-3">Slug</th><th className="p-3">Price</th><th className="p-3">Credits</th><th className="p-3">Bonus</th><th className="p-3">Active</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <PackageRow key={p.id} pkg={p} onAction={pkgAction} />
              ))}
            </tbody>
          </table>
        </Card>
        <NewPackage onAction={pkgAction} />
      </section>

      <GrantCredits onDone={() => fetch("/api/admin/wallet/stats").then((r) => r.json()).then((d) => setStats(d.stats))} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <Card className="p-4"><div className="text-xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></Card>;
}

function PackageRow({ pkg, onAction }: { pkg: Pkg; onAction: (b: Record<string, unknown>) => void }) {
  const [edit, setEdit] = useState(false);
  const [price, setPrice] = useState(String(pkg.usd_price));
  const [credits, setCredits] = useState(String(pkg.credits));
  const [bonus, setBonus] = useState(String(pkg.bonus));

  return (
    <tr className="border-b border-border/50">
      <td className="p-3 font-medium">{pkg.name}</td>
      <td className="p-3 text-muted-foreground">{pkg.slug}</td>
      <td className="p-3">{edit ? <Input value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 w-20" /> : `$${pkg.usd_price}`}</td>
      <td className="p-3">{edit ? <Input value={credits} onChange={(e) => setCredits(e.target.value)} className="h-8 w-24" /> : pkg.credits.toLocaleString()}</td>
      <td className="p-3">{edit ? <Input value={bonus} onChange={(e) => setBonus(e.target.value)} className="h-8 w-20" /> : pkg.bonus}</td>
      <td className="p-3">{pkg.is_active ? "Yes" : "No"}</td>
      <td className="p-3 text-right">
        <div className="flex justify-end gap-2">
          {edit ? (
            <>
              <Button size="sm" onClick={() => { onAction({ action: "update", id: pkg.id, usd_price: Number(price), credits: Number(credits), bonus: Number(bonus) }); setEdit(false); }}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setEdit(true)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => onAction({ action: pkg.is_active ? "disable" : "enable", id: pkg.id })}>{pkg.is_active ? "Disable" : "Enable"}</Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function NewPackage({ onAction }: { onAction: (b: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ slug: "", name: "", usd_price: "", credits: "", bonus: "0" });
  return (
    <Card className="space-y-3">
      <CardTitle className="text-base">Add a package</CardTitle>
      <div className="grid gap-3 sm:grid-cols-5">
        <div><Label htmlFor="aw-slug">Slug</Label><Input id="aw-slug" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></div>
        <div><Label htmlFor="aw-name">Name</Label><Input id="aw-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><Label htmlFor="aw-price">Price ($)</Label><Input id="aw-price" type="number" value={f.usd_price} onChange={(e) => setF({ ...f, usd_price: e.target.value })} /></div>
        <div><Label htmlFor="aw-credits">Credits</Label><Input id="aw-credits" type="number" value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} /></div>
        <div><Label htmlFor="aw-bonus">Bonus</Label><Input id="aw-bonus" type="number" value={f.bonus} onChange={(e) => setF({ ...f, bonus: e.target.value })} /></div>
      </div>
      <Button onClick={() => onAction({ action: "create", slug: f.slug, name: f.name, usd_price: Number(f.usd_price), credits: Number(f.credits), bonus: Number(f.bonus) })}>Create package</Button>
    </Card>
  );
}

function GrantCredits({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ userId: "", amount: "", type: "bonus", reason: "" });
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    const r = await fetch("/api/admin/wallet/credit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: f.userId.trim(), amount: Number(f.amount), type: f.type, reason: f.reason }),
    });
    const d = await r.json();
    if (!r.ok) setMsg(d.error || "Failed."); else { setMsg(`Done — new balance: ${d.newBalance?.toLocaleString()}`); setF({ ...f, amount: "", reason: "" }); onDone(); }
  }

  return (
    <section className="space-y-3">
      <CardTitle className="text-base">Issue / adjust credits</CardTitle>
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><Label htmlFor="aw-user-id">User ID</Label><Input id="aw-user-id" value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} placeholder="auth user uuid" /></div>
          <div><Label htmlFor="aw-amount-credits">Amount (± credits)</Label><Input id="aw-amount-credits" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="e.g. 500 or -100" /></div>
          <div>
            <Label htmlFor="aw-type">Type</Label>
            <select id="aw-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              {["bonus", "promo", "refund", "manual_adjustment", "admin_adjustment"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div><Label htmlFor="aw-reason">Reason</Label><Input id="aw-reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Why this adjustment was made" /></div>
        <Button onClick={submit} disabled={!f.userId || !f.amount}>Apply through ledger</Button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <p className="text-xs text-muted-foreground">Positive grants credits (bonus bucket); negative deducts. Every change is recorded in the immutable ledger and audit log.</p>
      </Card>
    </section>
  );
}
