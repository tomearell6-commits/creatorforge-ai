"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Package, Wrench } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

type Loc = { id: string; business_name: string };
type Item = { id: string; name: string; category: string | null; description: string | null; price: string | null };

export function ProductsServicesManager() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [locId, setLocId] = useState("");
  const [tab, setTab] = useState<"products" | "services">("products");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", description: "", price: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/local-business/locations").then((r) => r.json()).then((j) => { setLocs(j.locations ?? []); if (j.locations?.[0]) setLocId(j.locations[0].id); });
  }, []);
  const load = useCallback(() => {
    if (!locId) return;
    setLoading(true);
    fetch(`/api/local-business/${tab}?locationId=${locId}`).then((r) => r.json()).then((j) => setItems(j[tab] ?? [])).finally(() => setLoading(false));
  }, [locId, tab]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/local-business/${tab}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: locId, ...form }) });
      setForm({ name: "", category: "", description: "", price: "" }); load();
    } finally { setBusy(false); }
  }
  async function del(id: string) {
    await fetch(`/api/local-business/${tab}?id=${id}`, { method: "DELETE" }); load();
  }

  const Icon = tab === "products" ? Package : Wrench;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="lb-ps-loc" className="text-sm font-medium">Location</label>
            <select id="lb-ps-loc" value={locId} onChange={(e) => setLocId(e.target.value)} className="mt-1 block h-10 rounded-lg border border-border bg-background px-3 text-sm">
              {locs.length === 0 && <option value="">No locations</option>}
              {locs.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            {(["products", "services"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${tab === t ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20" : "border-border"}`}>{t}</button>)}
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" />
          <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" />
          <Button onClick={save} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Add</Button>
        </div>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="mt-2" />
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-brand-600" /><h2 className="text-base font-semibold capitalize">{tab}</h2></div>
        {loading ? <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>
          : items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No {tab} yet.</p>
          : <div className="mt-3 space-y-2">{items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{it.name}{it.price ? ` · ${it.price}` : ""}</p>{it.description && <p className="truncate text-xs text-muted-foreground">{it.description}</p>}</div>
                <Button variant="ghost" size="sm" onClick={() => del(it.id)} aria-label={`Delete ${it.name}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}</div>}
      </Card>
    </div>
  );
}
