"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Post = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "scheduled" | "published";
  category: string | null;
  source: "manual" | "ai" | "autopilot";
  cover_image_url: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  reading_minutes: number;
  updated_at: string;
};

const STATUS_VARIANT = { published: "success", scheduled: "warning", draft: "default" } as const;

export function AdminBlog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Generator form
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("Guides");
  const [tone, setTone] = useState("professional, helpful");
  const [publishNow, setPublishNow] = useState(false);
  const [genBusy, setGenBusy] = useState(false);

  const [confirmDel, setConfirmDel] = useState<Post | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Record<string, string>>({});
  const [coverBusy, setCoverBusy] = useState<string | null>(null); // post id, or "all"

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/blog");
    const j = await res.json().catch(() => ({ posts: [] }));
    setPosts(j.posts ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    if (!keyword.trim()) { setMsg({ kind: "error", text: "Enter a topic or focus keyword first." }); return; }
    setGenBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), category, tone, publish: publishNow }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Generation failed." }); return; }
      setMsg({
        kind: "success",
        text: `${j.usedAI ? "AI-written" : "Draft"} article "${j.post?.title}" ${publishNow ? "published live" : "saved as a draft"}.${j.usedAI ? "" : " (Placeholder mode — set ANTHROPIC_API_KEY for real AI writing.)"}`,
      });
      setKeyword("");
      await load();
    } finally {
      setGenBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, okText: string) {
    setMsg(null);
    const res = await fetch("/api/admin/blog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg({ kind: "error", text: j.error || "Update failed." }); return; }
    setMsg({ kind: "success", text: okText });
    await load();
  }

  async function genCover(id: string) {
    setCoverBusy(id); setMsg(null);
    try {
      const res = await fetch("/api/admin/blog/cover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Cover generation failed." }); return; }
      setMsg({ kind: "success", text: "Cover image generated." });
      await load();
    } finally { setCoverBusy(null); }
  }

  async function genAllCovers() {
    setCoverBusy("all"); setMsg(null);
    try {
      const res = await fetch("/api/admin/blog/cover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Cover generation failed." }); return; }
      setMsg({ kind: "success", text: `Generated ${j.generated} cover${j.generated === 1 ? "" : "s"}${j.attempted > j.generated ? ` (${j.attempted - j.generated} skipped — run again to retry).` : "."}` });
      await load();
    } finally { setCoverBusy(null); }
  }

  async function del() {
    if (!confirmDel) return;
    const res = await fetch("/api/admin/blog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: confirmDel.id }) });
    if (res.ok) { setMsg({ kind: "success", text: "Post deleted." }); await load(); }
    else setMsg({ kind: "error", text: "Could not delete the post." });
    setConfirmDel(null);
  }

  return (
    <div className="space-y-6">
      {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}

      {/* AI generator */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Write an SEO article with AI</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a topic or keyword your customers search for. The AI writes a full, SEO-optimized article (title, meta, headings, FAQ) and saves it to your blog.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="blog-kw">Topic / focus keyword</Label>
            <Input id="blog-kw" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. how to make faceless YouTube videos with AI" onKeyDown={(e) => e.key === "Enter" && !genBusy && generate()} />
          </div>
          <div>
            <Label htmlFor="blog-cat">Category</Label>
            <Input id="blog-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Guides" />
          </div>
          <div>
            <Label htmlFor="blog-tone">Tone</Label>
            <Input id="blog-tone" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="professional, helpful" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="h-4 w-4" />
            Publish immediately (otherwise saved as draft to review)
          </label>
          <Button onClick={generate} disabled={genBusy}>{genBusy ? "Writing… (up to ~30s)" : "Generate article"}</Button>
        </div>
      </Card>

      {/* Posts list */}
      <Card className="overflow-x-auto p-0">
        <div className="flex items-center justify-between gap-3 p-4">
          <h2 className="text-lg font-semibold">Articles</h2>
          <div className="flex items-center gap-3">
            {posts.some((p) => !p.cover_image_url) && (
              <Button variant="ghost" onClick={genAllCovers} disabled={coverBusy !== null}>
                {coverBusy === "all" ? "Generating covers…" : "🖼 Generate missing covers"}
              </Button>
            )}
            <span className="text-sm text-muted-foreground">{posts.length} total</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3">Source</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-border/50 align-top">
                <td className="p-3">
                  <div className="flex gap-3">
                    <div className="h-12 w-20 shrink-0 overflow-hidden rounded border border-border bg-muted">
                      {p.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[9px] text-muted-foreground">no image</div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">/blog/{p.slug} · {p.reading_minutes} min{p.category ? ` · ${p.category}` : ""}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  {p.status === "scheduled" && p.scheduled_for && (
                    <div className="mt-1 text-xs text-muted-foreground">{new Date(p.scheduled_for).toLocaleString()}</div>
                  )}
                </td>
                <td className="p-3 text-xs uppercase text-muted-foreground">{p.source}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {p.status !== "published"
                      ? <button className="text-green-600 underline" onClick={() => patch(p.id, { status: "published" }, "Published live.")}>Publish now</button>
                      : <button className="text-amber-600 underline" onClick={() => patch(p.id, { status: "draft" }, "Moved back to draft.")}>Unpublish</button>}
                    {p.status === "published" && <a className="text-brand-600 underline" href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">View</a>}
                    <button className="text-brand-600 underline disabled:opacity-50" disabled={coverBusy !== null} onClick={() => genCover(p.id)}>
                      {coverBusy === p.id ? "…" : p.cover_image_url ? "New cover" : "Add cover"}
                    </button>
                    <button className="text-red-600 underline" onClick={() => setConfirmDel(p)}>Delete</button>
                  </div>
                  {p.status !== "published" && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={scheduleFor[p.id] ?? ""}
                        onChange={(e) => setScheduleFor((s) => ({ ...s, [p.id]: e.target.value }))}
                        className="rounded border border-border bg-background px-2 py-1 text-xs"
                        aria-label={`Schedule ${p.title}`}
                      />
                      <button
                        className="text-brand-600 underline"
                        onClick={() => {
                          const v = scheduleFor[p.id];
                          if (!v) { setMsg({ kind: "error", text: "Pick a date/time to schedule." }); return; }
                          patch(p.id, { status: "scheduled", scheduled_for: new Date(v).toISOString() }, "Scheduled — it will auto-publish.");
                        }}
                      >Schedule</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && posts.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No articles yet. Generate your first one above.</td></tr>}
            {loading && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
          </tbody>
        </table>
      </Card>

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete this article?"
        description={confirmDel ? `Permanently delete "${confirmDel.title}"? This can't be undone.` : undefined}
        confirmLabel="Delete"
        onConfirm={del}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
