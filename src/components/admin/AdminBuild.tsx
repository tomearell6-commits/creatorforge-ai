"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type Stats = { projects: number; exports: number; templates: number; creditsUsed: number };
type Template = { id: string; name: string; category: string | null; is_premium: boolean; is_featured: boolean; is_active: boolean };

const BLANK = { name: "", category: "website", projectType: "", description: "", defaultIdea: "", estimatedCredits: 20, isPremium: false, isFeatured: false };

export function AdminBuild() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ ...BLANK });
  const [msg, setMsg] = useState<{ v: "error" | "success"; t: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/build", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) { setStats(json.stats); setTemplates(json.templates ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setMsg(null);
    const r = await fetch("/api/admin/build", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json();
    if (!r.ok) { setMsg({ v: "error", t: d.message || "Failed" }); return; }
    setF({ ...BLANK });
    setMsg({ v: "success", t: "Template created." });
    await load();
  };
  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch("/api/admin/build", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    await load();
  };
  const remove = async (id: string) => {
    await fetch("/api/admin/build", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  };

  if (loading) return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Spinner size="sm" /> Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><div className="text-2xl font-bold">{stats?.projects ?? 0}</div><div className="text-xs text-muted-foreground">Projects</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">{stats?.exports ?? 0}</div><div className="text-xs text-muted-foreground">Exports</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">{stats?.templates ?? 0}</div><div className="text-xs text-muted-foreground">DB templates</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">{stats?.creditsUsed ?? 0}</div><div className="text-xs text-muted-foreground">Credits used</div></Card>
      </div>

      <section className="space-y-3">
        <CardTitle className="text-base">Add a build template</CardTitle>
        <Card className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Template name" aria-label="Template name" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            <input value={f.projectType} onChange={(e) => setF({ ...f, projectType: e.target.value })} placeholder="project type slug (e.g. saas-app)" aria-label="Project type slug" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <textarea value={f.defaultIdea} onChange={(e) => setF({ ...f, defaultIdea: e.target.value })} rows={2} placeholder="Default idea brief" aria-label="Default idea" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isPremium} onChange={(e) => setF({ ...f, isPremium: e.target.checked })} /> Premium</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isFeatured} onChange={(e) => setF({ ...f, isFeatured: e.target.checked })} /> Featured</label>
            <Button onClick={create} disabled={!f.name}>Add template</Button>
          </div>
          {msg && <Alert variant={msg.v} className="py-2">{msg.t}</Alert>}
          <p className="text-xs text-muted-foreground">The built-in starter set (15 templates) always remains available to users.</p>
        </Card>
      </section>

      {templates.length > 0 && (
        <section className="space-y-2">
          <CardTitle className="text-base">DB templates ({templates.length})</CardTitle>
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="text-sm font-medium">{t.name}</span>
              <span className="flex items-center gap-2">
                {t.is_premium && <Badge variant="warning">Premium</Badge>}
                {t.is_featured && <Badge variant="brand">Featured</Badge>}
                <Badge variant={t.is_active ? "success" : "default"}>{t.is_active ? "Active" : "Hidden"}</Badge>
                <Button size="sm" variant="ghost" onClick={() => patch(t.id, { isActive: !t.is_active })}>{t.is_active ? "Hide" : "Show"}</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(t.id)}>Delete</Button>
              </span>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
