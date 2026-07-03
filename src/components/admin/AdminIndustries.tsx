"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type Suite = { id: string; name: string; slug: string; status: string; sort_order: number };
type Template = { id: string; name: string; output_type: string; estimated_credits: number; is_premium: boolean; is_featured: boolean; is_active: boolean };
type Stats = { projects: number; outputs: number; walkthroughs: number; exports: number };

const BLANK = { suiteSlug: "real-estate-architecture", name: "", description: "", outputType: "concept_prompt", estimatedCredits: 8, isPremium: false, isFeatured: false };

/** Admin: Industry Suites — flip suite status, manage DB industry templates,
 *  see real-estate usage. Built-in config suites/templates ship in code. */
export function AdminIndustries() {
  const [suites, setSuites] = useState<Suite[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ ...BLANK });
  const [msg, setMsg] = useState<{ v: "error" | "success"; t: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/design/industries", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setSuites(json.suites ?? []);
        setTemplates(json.templates ?? []);
        setStats(json.stats ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const patchSuite = useCallback(async (slug: string, status: string) => {
    await fetch("/api/admin/design/industries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "suite", slug, status }) });
    await load();
  }, [load]);

  const createTemplate = useCallback(async () => {
    setMsg(null);
    const r = await fetch("/api/admin/design/industries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json();
    if (!r.ok) { setMsg({ v: "error", t: d.message || "Failed to create template" }); return; }
    setF({ ...BLANK });
    setMsg({ v: "success", t: "Industry template created." });
    await load();
  }, [f, load]);

  const patchTemplate = useCallback(async (id: string, body: Record<string, unknown>) => {
    await fetch("/api/admin/design/industries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    await load();
  }, [load]);

  const removeTemplate = useCallback(async (id: string) => {
    await fetch("/api/admin/design/industries", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }, [load]);

  const metrics = [
    { label: "RE projects", value: stats?.projects },
    { label: "AI outputs", value: stats?.outputs },
    { label: "Walkthroughs", value: stats?.walkthroughs },
    { label: "Exports", value: stats?.exports },
  ];

  return (
    <div className="space-y-6">
      <CardTitle className="text-base">Industry Suites</CardTitle>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="p-4">
            <div className="text-2xl font-bold">{loading ? "—" : m.value ?? 0}</div>
            <div className="text-xs text-muted-foreground">{m.label}</div>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Loading suites…</div>
      ) : suites.length === 0 ? (
        <Alert variant="warning">No suites in the database — run migration 0028 to seed the 13 Industry Suites. The built-in registry still works for users.</Alert>
      ) : (
        <div className="space-y-2">
          {suites.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={s.status === "active" ? "success" : s.status === "hidden" ? "danger" : "default"}>{s.status.replace("_", " ")}</Badge>
                {s.status !== "active" && <Button size="sm" variant="ghost" onClick={() => patchSuite(s.slug, "active")}>Activate</Button>}
                {s.status === "active" && s.slug !== "real-estate-architecture" && (
                  <Button size="sm" variant="ghost" onClick={() => patchSuite(s.slug, "coming_soon")}>Set coming soon</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <CardTitle className="text-base">Add an industry template</CardTitle>
        <Card className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="ai-suite" className="mb-1 block text-sm font-medium">Suite</label>
              <select id="ai-suite" value={f.suiteSlug} onChange={(e) => setF({ ...f, suiteSlug: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                {suites.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select></div>
            <div><label htmlFor="ai-name" className="mb-1 block text-sm font-medium">Name</label>
              <input id="ai-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></div>
            <div><label htmlFor="ai-out" className="mb-1 block text-sm font-medium">Output type</label>
              <input id="ai-out" value={f.outputType} onChange={(e) => setF({ ...f, outputType: e.target.value })} placeholder="concept_prompt" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></div>
            <div><label htmlFor="ai-cr" className="mb-1 block text-sm font-medium">Estimated credits</label>
              <input id="ai-cr" type="number" value={f.estimatedCredits} onChange={(e) => setF({ ...f, estimatedCredits: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></div>
          </div>
          <div><label htmlFor="ai-desc" className="mb-1 block text-sm font-medium">Description / default prompt</label>
            <textarea id="ai-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isPremium} onChange={(e) => setF({ ...f, isPremium: e.target.checked })} /> Premium</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isFeatured} onChange={(e) => setF({ ...f, isFeatured: e.target.checked })} /> Featured</label>
            <Button onClick={createTemplate} disabled={!f.name}>Add template</Button>
          </div>
          {msg && <Alert variant={msg.v} className="py-2">{msg.t}</Alert>}
        </Card>
      </section>

      {templates.length > 0 && (
        <section className="space-y-3">
          <CardTitle className="text-base">DB industry templates ({templates.length})</CardTitle>
          {templates.map((x) => (
            <Card key={x.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{x.name}</p>
                <p className="text-xs text-muted-foreground">{x.output_type} · ~{x.estimated_credits} cr</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {x.is_premium && <Badge variant="warning">Premium</Badge>}
                {x.is_featured && <Badge variant="brand">Featured</Badge>}
                <Badge variant={x.is_active ? "success" : "default"}>{x.is_active ? "Active" : "Hidden"}</Badge>
                <Button size="sm" variant="ghost" onClick={() => patchTemplate(x.id, { isActive: !x.is_active })}>{x.is_active ? "Hide" : "Show"}</Button>
                <Button size="sm" variant="ghost" onClick={() => patchTemplate(x.id, { isFeatured: !x.is_featured })}>{x.is_featured ? "Unfeature" : "Feature"}</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeTemplate(x.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
