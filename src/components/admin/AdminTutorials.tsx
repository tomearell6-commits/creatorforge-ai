"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { TUTORIAL_CATEGORIES } from "@/config/tutorialCatalog";

const BLANK = { title: "", description: "", category: "Getting Started", video_url: "", duration: "", level: "beginner", sort_order: 0, is_published: true, cta_label: "", cta_url: "" };

export function AdminTutorials() {
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState<any>({ ...BLANK });
  const [msg, setMsg] = useState<string | null>(null);
  const [busyThumb, setBusyThumb] = useState<string | null>(null);

  function load() { fetch("/api/admin/tutorials").then((r) => r.json()).then((d) => setRows(d.tutorials ?? [])); }
  useEffect(() => { load(); }, []);

  async function create() {
    setMsg(null);
    const r = await fetch("/api/admin/tutorials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error || "Failed."); return; }
    setF({ ...BLANK }); load();
  }
  async function patch(id: string, body: any) { await fetch("/api/admin/tutorials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }); load(); }
  async function remove(id: string) { await fetch(`/api/admin/tutorials?id=${id}`, { method: "DELETE" }); load(); }
  async function genThumb(id: string) {
    setBusyThumb(id); setMsg(null);
    const r = await fetch("/api/admin/tutorials/thumbnail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorialId: id }) });
    const d = await r.json().catch(() => ({}));
    setBusyThumb(null);
    if (!r.ok) { setMsg(d.error || "Thumbnail generation failed."); return; }
    load();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <CardTitle className="text-base">Add a tutorial video</CardTitle>
        <Card className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="at-title">Title</Label><Input id="at-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div>
              <Label htmlFor="at-category">Category</Label>
              <select id="at-category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                {TUTORIAL_CATEGORIES.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="at-cta-label">CTA label (shown after the video)</Label><Input id="at-cta-label" value={f.cta_label} onChange={(e) => setF({ ...f, cta_label: e.target.value })} placeholder="Enable 2FA" /></div>
            <div><Label htmlFor="at-cta-url">CTA link</Label><Input id="at-cta-url" value={f.cta_url} onChange={(e) => setF({ ...f, cta_url: e.target.value })} placeholder="/dashboard/settings" /></div>
          </div>
          <div><Label htmlFor="at-description">Description</Label><Textarea id="at-description" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div><Label htmlFor="at-video-url-mp4-upload-to-supabase-storage-or-paste-any-url">Video URL (MP4 — upload to Supabase storage or paste any URL)</Label><Input id="at-video-url-mp4-upload-to-supabase-storage-or-paste-any-url" value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} placeholder="https://…/video.mp4" /></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label htmlFor="at-duration">Duration</Label><Input id="at-duration" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} placeholder="2:14" /></div>
            <div><Label htmlFor="at-level">Level</Label><select id="at-level" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option>beginner</option><option>intermediate</option><option>advanced</option></select></div>
            <div><Label htmlFor="at-sort">Sort</Label><Input id="at-sort" type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={create} disabled={!f.title || !f.video_url}>Add tutorial</Button>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </Card>
      </section>

      <section className="space-y-3">
        <CardTitle className="text-base">Tutorials ({rows.length})</CardTitle>
        {rows.map((t) => (
          <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{t.title}</p>
              <p className="text-xs text-muted-foreground">
                {t.category} · {t.level}{t.duration ? ` · ${t.duration}` : ""}
                {t.status && t.status !== "published" ? ` · ${t.status}` : ""}
                {" · "}{t._starts ?? 0} started / {t._completions ?? 0} completed
                {t.thumbnail_url ? " · 🖼 thumb" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${t.is_published ? "bg-brand-100 text-brand-900" : "bg-muted text-muted-foreground"}`}>{t.is_published ? "Published" : "Hidden"}</span>
              <Button size="sm" variant="ghost" disabled={busyThumb === t.id} onClick={() => genThumb(t.id)}>
                {busyThumb === t.id ? "Generating…" : "AI thumbnail (8cr)"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => patch(t.id, { is_published: !t.is_published, status: !t.is_published ? "published" : "draft" })}>{t.is_published ? "Unpublish" : "Publish"}</Button>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(t.id)}>Delete</Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
