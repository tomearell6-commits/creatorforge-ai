"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

const ACCENTS = ["pink", "sky", "violet", "emerald", "amber", "rose"];
const BLANK = { name: "", role: "", quote: "", rating: 5, platform: "", accent: "sky", is_published: true, sort_order: 0 };

export function AdminTestimonials() {
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState<any>({ ...BLANK });
  const [msg, setMsg] = useState<string | null>(null);

  function load() { fetch("/api/admin/testimonials").then((r) => r.json()).then((d) => setRows(d.testimonials ?? [])); }
  useEffect(() => { load(); }, []);

  async function create() {
    setMsg(null);
    const r = await fetch("/api/admin/testimonials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error || "Failed."); return; }
    setF({ ...BLANK }); load();
  }
  async function patch(id: string, body: any) { await fetch("/api/admin/testimonials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }); load(); }
  async function remove(id: string) { await fetch(`/api/admin/testimonials?id=${id}`, { method: "DELETE" }); load(); }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <CardTitle className="text-base">Add a testimonial</CardTitle>
        <Card className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="atm-name">Name</Label><Input id="atm-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label htmlFor="atm-role">Role</Label><Input id="atm-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></div>
          </div>
          <div><Label htmlFor="atm-quote">Quote</Label><Textarea id="atm-quote" rows={2} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div><Label htmlFor="atm-rating">Rating</Label><Input id="atm-rating" type="number" min={1} max={5} value={f.rating} onChange={(e) => setF({ ...f, rating: Number(e.target.value) })} /></div>
            <div><Label htmlFor="atm-platform">Platform</Label><Input id="atm-platform" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} /></div>
            <div><Label htmlFor="atm-accent">Accent</Label><select id="atm-accent" value={f.accent} onChange={(e) => setF({ ...f, accent: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{ACCENTS.map((a) => <option key={a}>{a}</option>)}</select></div>
            <div><Label htmlFor="atm-sort">Sort</Label><Input id="atm-sort" type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={create} disabled={!f.name || !f.quote}>Add testimonial</Button>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <p className="text-xs text-muted-foreground">Only add real quotes you have permission to publish. Published testimonials show on the homepage.</p>
        </Card>
      </section>

      <section className="space-y-3">
        <CardTitle className="text-base">Testimonials ({rows.length})</CardTitle>
        {rows.length === 0 && <Card className="text-sm text-muted-foreground">None yet — the homepage shows built-in sample quotes until you add your own.</Card>}
        {rows.map((t) => (
          <Card key={t.id} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold">{t.name} <span className="text-xs text-muted-foreground">{t.role}</span></p><p className="mt-1 text-sm text-muted-foreground">“{t.quote}”</p></div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{t.rating}★ {t.platform}</span>
                <Button size="sm" variant="ghost" onClick={() => patch(t.id, { is_published: !t.is_published })}>{t.is_published ? "Unpublish" : "Publish"}</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(t.id)}>Delete</Button>
              </div>
            </div>
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${t.is_published ? "bg-brand-100 text-brand-900" : "bg-muted text-muted-foreground"}`}>{t.is_published ? "Published" : "Hidden"}</span>
          </Card>
        ))}
      </section>
    </div>
  );
}
