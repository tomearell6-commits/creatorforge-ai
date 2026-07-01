"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CATEGORIES, PLATFORMS, VISIBILITY_OPTIONS } from "@/lib/constants";
import { PlatformIcon } from "@/components/icons/PlatformIcon";
import type { PublishJob, PublishMode, SocialAccount, SocialPlatform, Visibility } from "@/lib/types";

type VideoAsset = { id: string; name: string; url: string; project_id: string | null };

const PUBLISH_STATUS_VARIANT = {
  published: "success",
  failed: "danger",
} as const;

export function PublishComposer() {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [jobs, setJobs] = useState<PublishJob[]>([]);

  const [assetId, setAssetId] = useState<string>("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [playlist, setPlaylist] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [mode, setMode] = useState<PublishMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "info" | "success" | "error"; text: string } | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  async function loadAll() {
    const [a, s, j] = await Promise.all([
      fetch("/api/assets?type=video").then((r) => r.json()),
      fetch("/api/social").then((r) => r.json()),
      fetch("/api/publish").then((r) => r.json()),
    ]);
    setVideos(a.assets ?? []);
    setAccounts(s.accounts ?? []);
    setJobs(j.jobs ?? []);
    if (!assetId && a.assets?.[0]) setAssetId(a.assets[0].id);
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const connected = accounts.filter((a) => a.status === "connected").map((a) => a.platform);

  function togglePlatform(p: SocialPlatform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function runOptimize() {
    if (!title.trim()) { setMsg({ kind: "error", text: "Add a title first to optimize." }); return; }
    setOptimizing(true);
    const res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category }),
    });
    const o = await res.json();
    if (o.seoTitle) setTitle(o.seoTitle);
    if (o.description) setDescription(o.description);
    if (o.hashtags) setHashtags(o.hashtags.join(" "));
    setMsg({ kind: "success", text: o.usedAI ? "Optimized with AI." : "Optimized (placeholder)." });
    setOptimizing(false);
  }

  function requestSubmit() {
    if (!title.trim()) { setMsg({ kind: "error", text: "Title is required." }); return; }
    if (platforms.length === 0) { setMsg({ kind: "error", text: "Select at least one platform." }); return; }
    if (mode === "schedule" && !scheduledAt) { setMsg({ kind: "error", text: "Pick a date & time." }); return; }
    if (mode === "now") { setConfirmPublish(true); return; }
    submit();
  }

  async function submit() {
    setBusy(true); setMsg(null);
    const video = videos.find((v) => v.id === assetId);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId, projectId: video?.project_id, videoUrl: video?.url,
        platforms, title, description,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
        thumbnailUrl, playlist, category, visibility, mode, scheduledAt,
      }),
    });
    const json = await res.json();
    if (!res.ok) setMsg({ kind: "error", text: json.error ?? "Failed" });
    else { setMsg({ kind: "success", text: mode === "now" ? "Published!" : mode === "schedule" ? "Scheduled!" : "Saved as draft." }); await loadAll(); }
    setBusy(false);
    setConfirmPublish(false);
  }

  async function retry(id: string) {
    await fetch(`/api/publish/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    });
    await loadAll();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="space-y-4">
          <div>
            <label htmlFor="pc-rendered-video" className="text-sm font-medium">Rendered video</label>
            {videos.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No rendered videos yet. <Link className="text-brand-600 underline" href="/dashboard/render">Render one first.</Link>
              </p>
            ) : (
              <select id="pc-rendered-video" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                {videos.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Platforms</label>
              <Link href="/dashboard/social" className="text-xs text-brand-600 underline">Manage connections</Link>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const isConnected = connected.includes(p.id);
                const active = platforms.includes(p.id);
                return (
                  <button key={p.id} type="button" disabled={!isConnected} onClick={() => togglePlatform(p.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${active ? "border-brand-600 bg-brand-600 text-white" : "border-border bg-card"} ${!isConnected ? "opacity-40 cursor-not-allowed" : ""}`}
                    title={isConnected ? "" : "Connect this platform first"}>
                    <PlatformIcon platform={p.id} className="h-3.5 w-3.5" monochrome={active} /> {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label htmlFor="pc-title" className="text-sm font-medium">Title</label>
            <Button size="sm" variant="outline" disabled={optimizing} onClick={runOptimize}>
              {optimizing ? "Optimizing…" : "✨ AI optimize"}
            </Button>
          </div>
          <Input id="pc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video title" />

          <div>
            <label htmlFor="pc-description" className="text-sm font-medium">Description</label>
            <textarea id="pc-description" className="mt-1 h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>

          <div>
            <label htmlFor="pc-hashtags" className="text-sm font-medium">Hashtags</label>
            <Input id="pc-hashtags" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#viral #ai #content" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pc-thumbnail-url" className="text-sm font-medium">Thumbnail URL</label>
              <Input id="pc-thumbnail-url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label htmlFor="pc-playlist" className="text-sm font-medium">Playlist (YouTube)</label>
              <Input id="pc-playlist" value={playlist} onChange={(e) => setPlaylist(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label htmlFor="pc-category" className="text-sm font-medium">Category</label>
              <select id="pc-category" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pc-visibility" className="text-sm font-medium">Visibility</label>
              <select id="pc-visibility" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                {VISIBILITY_OPTIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="space-y-3">
          <label className="text-sm font-medium">Publishing mode</label>
          <div className="flex gap-2">
            {(["now", "schedule", "draft"] as PublishMode[]).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-sm capitalize ${mode === m ? "border-brand-600 bg-brand-600 text-white" : "border-border"}`}>
                {m === "now" ? "Publish now" : m}
              </button>
            ))}
          </div>
          {mode === "schedule" && (
            <input aria-label="Scheduled publish date and time" type="datetime-local" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          )}
          <Button className="w-full" disabled={busy} onClick={requestSubmit}>
            {busy ? "Working…" : mode === "now" ? "Publish now" : mode === "schedule" ? "Schedule" : "Save draft"}
          </Button>
          {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
        </Card>

        <Card>
          <h3 className="font-semibold">Recent publishes</h3>
          <div className="mt-3 space-y-2">
            {jobs.length === 0 && <p className="text-sm text-muted-foreground">Nothing published yet.</p>}
            {jobs.slice(0, 8).map((j) => (
              <div key={j.id} className="rounded-lg border border-border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium">{j.title || "Untitled"}</span>
                  <Badge variant={PUBLISH_STATUS_VARIANT[j.status as keyof typeof PUBLISH_STATUS_VARIANT] ?? "default"}>{j.status}</Badge>
                </div>
                {j.status === "failed" && (
                  <button className="mt-1 text-xs text-brand-600 underline" onClick={() => retry(j.id)}>Retry</button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        danger={false}
        title="Publish now?"
        description={`Publish "${title}" to ${platforms.length} platform${platforms.length === 1 ? "" : "s"} (${platforms.join(", ")}) right now?`}
        confirmLabel="Publish now"
        loading={busy}
        onConfirm={submit}
        onCancel={() => setConfirmPublish(false)}
      />
    </div>
  );
}
