"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type Stats = { projects: number; exports: number; templates: number; brandKits: number; footageConcepts: number; failedJobs: number; creditsUsed: number };
type Template = { id: string; name: string; category: string | null; format: string | null; is_premium: boolean; is_featured: boolean; is_active: boolean; credits_required: number };

const BLANK = { name: "", category: "", format: "square-1-1", creditsRequired: 0, isPremium: false, isFeatured: false };

export function AdminDesign() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ ...BLANK });
  const [msg, setMsg] = useState<{ v: "error" | "success"; t: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        fetch("/api/admin/design/stats", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/design/templates", { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (s.ok) setStats(s.stats);
      if (t.ok) setTemplates(t.templates ?? []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async () => {
    setMsg(null);
    const r = await fetch("/api/admin/design/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json();
    if (!r.ok) { setMsg({ v: "error", t: d.message || "Failed to create template" }); return; }
    setF({ ...BLANK });
    setMsg({ v: "success", t: "Template created." });
    await load();
  }, [f, load]);

  const patch = useCallback(async (id: string, body: Record<string, unknown>) => {
    await fetch("/api/admin/design/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await fetch("/api/admin/design/templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }, [load]);

  const metrics: { label: string; value: number | undefined }[] = [
    { label: "Designs", value: stats?.projects },
    { label: "Exports", value: stats?.exports },
    { label: "Templates", value: stats?.templates },
    { label: "Brand kits", value: stats?.brandKits },
    { label: "Footage concepts", value: stats?.footageConcepts },
    { label: "Credits used", value: stats?.creditsUsed },
    { label: "Failed jobs", value: stats?.failedJobs },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {metrics.map((m) => (
          <Card key={m.label} className="p-4">
            <div className="text-2xl font-bold">{loading ? "—" : m.value ?? 0}</div>
            <div className="text-xs text-muted-foreground">{m.label}</div>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <CardTitle className="text-base">Add a design template</CardTitle>
        <Card className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="ad-name" className="mb-1 block text-sm font-medium">Name</label>
              <input id="ad-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></div>
            <div><label htmlFor="ad-cat" className="mb-1 block text-sm font-medium">Category slug</label>
              <input id="ad-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="instagram-post" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></div>
            <div><label htmlFor="ad-fmt" className="mb-1 block text-sm font-medium">Format id</label>
              <input id="ad-fmt" value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></div>
            <div><label htmlFor="ad-cr" className="mb-1 block text-sm font-medium">Credits required</label>
              <input id="ad-cr" type="number" value={f.creditsRequired} onChange={(e) => setF({ ...f, creditsRequired: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isPremium} onChange={(e) => setF({ ...f, isPremium: e.target.checked })} /> Premium</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isFeatured} onChange={(e) => setF({ ...f, isFeatured: e.target.checked })} /> Featured</label>
            <Button onClick={create} disabled={!f.name}>Add template</Button>
          </div>
          {msg && <Alert variant={msg.v} className="py-2">{msg.t}</Alert>}
          <p className="text-xs text-muted-foreground">Note: the studio also ships with a built-in starter template set; these DB templates augment it.</p>
        </Card>
      </section>

      <section className="space-y-3">
        <CardTitle className="text-base">Managed templates ({templates.length})</CardTitle>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Loading…</div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admin templates yet — the built-in starter set is always available to users.</p>
        ) : (
          templates.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.category ?? "—"} · {t.format ?? "—"}{t.credits_required ? ` · ${t.credits_required} cr` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {t.is_premium && <Badge variant="warning">Premium</Badge>}
                {t.is_featured && <Badge variant="brand">Featured</Badge>}
                <Badge variant={t.is_active ? "success" : "default"}>{t.is_active ? "Active" : "Hidden"}</Badge>
                <Button size="sm" variant="ghost" onClick={() => patch(t.id, { isActive: !t.is_active })}>{t.is_active ? "Hide" : "Show"}</Button>
                <Button size="sm" variant="ghost" onClick={() => patch(t.id, { isFeatured: !t.is_featured })}>{t.is_featured ? "Unfeature" : "Feature"}</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(t.id)}>Delete</Button>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
