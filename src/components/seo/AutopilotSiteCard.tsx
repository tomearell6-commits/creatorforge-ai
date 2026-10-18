"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

export type LogRow = { id: string; article_id: string | null; status: string; stage: string | null; message: string | null; title: string | null; post_url: string | null; words: number | null; created_at: string };
export type PendingArticle = { id: string; title: string | null; words: number | null; created_at: string; cover: string | null };
export type AutopostItem = {
  id: string; project_id: string | null; mode: "auto" | "review" | "first3"; pending: PendingArticle[]; wordpress_site_id: string; active: boolean; niche: string; posts_per_day: number; min_words: number;
  publish_hours: number[]; posts_published: number; paused_reason: string | null; last_success_at: string | null;
  queued_topics: number; monthly_credit_estimate: number;
  site: { id: string; site_name: string; site_url: string; indexnow_connected: boolean } | null;
  recent: LogRow[];
};
export type IxSite = { id: string; siteName: string; siteUrl: string; connected: boolean; key: string | null; fileName: string | null; error: string | null; rankMath?: boolean };

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Something went wrong.");
  return j as T;
}

const localTime = (utcHour: number) =>
  new Date(Date.UTC(2000, 0, 1, utcHour)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

type Preview = { id: string; title: string | null; metaDescription: string | null; words: number | null; coverUrl: string | null; html: string };

/** Articles written in "review" mode: read each one, then approve (publish) or reject. */
function ReviewQueue({ items, onChanged, onMessage }: {
  items: PendingArticle[];
  onChanged: () => Promise<void> | void;
  onMessage: (m: { kind: "success" | "error"; text: string }) => void;
}) {
  const [open, setOpen] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function preview(id: string) {
    setBusy(`p-${id}`);
    try { setOpen((await api<{ article: Preview }>(`/api/seo/autopost/review/${id}`)).article); }
    catch (e) { onMessage({ kind: "error", text: e instanceof Error ? e.message : "Could not open the article." }); }
    finally { setBusy(null); }
  }
  async function decide(id: string, action: "approve" | "reject") {
    if (action === "reject" && !confirm("Reject this article? It will not be published, and the credits already used to write it are not refunded.")) return;
    setBusy(`${action}-${id}`);
    try {
      const r = await api<{ message: string }>(`/api/seo/autopost/review/${id}`, { method: "POST", body: JSON.stringify({ action }) });
      onMessage({ kind: "success", text: r.message });
      setOpen(null);
      await onChanged();
    } catch (e) { onMessage({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." }); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-3 rounded-lg border border-brand-600 p-4">
      <p className="text-sm font-semibold">Waiting for your review ({items.length})</p>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-medium">{a.title ?? "Untitled article"}</span>
              <span className="text-xs text-muted-foreground"> · {a.words ? `${a.words.toLocaleString()} words · ` : ""}{new Date(a.created_at).toLocaleDateString()}</span>
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => preview(a.id)}>{busy === `p-${a.id}` ? <Spinner size="sm" /> : "Read it"}</Button>
              <Button size="sm" disabled={busy !== null} onClick={() => decide(a.id, "approve")}>{busy === `approve-${a.id}` ? <><Spinner size="sm" /> Publishing…</> : "Approve & publish"}</Button>
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => decide(a.id, "reject")}>Reject</Button>
            </span>
          </li>
        ))}
      </ul>

      {open && (
        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">{open.title}</p>
              {open.metaDescription && <p className="text-xs text-muted-foreground">Search description: {open.metaDescription}</p>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>Close</Button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {open.coverUrl && <img src={open.coverUrl} alt="" className="w-full max-w-xl rounded-lg border border-border" />}
          <div className="blog-content max-h-[28rem] overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: open.html }} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy !== null} onClick={() => decide(open.id, "approve")}>{busy === `approve-${open.id}` ? <><Spinner size="sm" /> Publishing…</> : "Approve & publish"}</Button>
            <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => decide(open.id, "reject")}>Reject</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Status + controls for one website that is posting automatically. */
export function AutopilotSiteCard({ it, ixSite, onChanged, onMessage }: {
  it: AutopostItem;
  ixSite: IxSite | undefined;
  onChanged: () => Promise<void> | void;
  onMessage: (m: { kind: "success" | "error"; text: string }) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [ixOpen, setIxOpen] = useState(false);
  const [pluginKey, setPluginKey] = useState("");
  const connected = !!it.site?.indexnow_connected;
  const status = !it.active ? { label: "Paused", variant: "warning" as const } : it.paused_reason?.startsWith("Waiting") ? { label: "Waiting", variant: "info" as const } : { label: "Posting daily", variant: "success" as const };

  async function run(key: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(key);
    try { await fn(); if (ok) onMessage({ kind: "success", text: ok }); await onChanged(); }
    catch (e) { onMessage({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." }); }
    finally { setBusy(null); }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{it.site?.site_name ?? "Website"}</p>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{it.site?.site_url}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy === "run" || !it.active}
            onClick={() => run("run", async () => {
              const r = await api<{ status: string; message: string }>("/api/seo/autopost/run", { method: "POST", body: JSON.stringify({ id: it.id }) });
              if (r.status !== "published" && r.status !== "drafted") throw new Error(r.message);
              onMessage({ kind: "success", text: r.status === "drafted" ? "Your article is ready. Read it under “Waiting for your review” below, then approve it." : "Article published." });
            })}>
            {busy === "run" ? <><Spinner size="sm" /> Writing (2–3 min)…</> : "Publish one now"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy === "tog"} onClick={() => run("tog", () => api("/api/seo/autopost", { method: "PATCH", body: JSON.stringify({ id: it.id, active: !it.active }) }))}>
            {it.active ? "Pause" : "Resume"}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy === "del"}
            onClick={() => { if (confirm("Stop auto-posting for this website? Articles already published stay online.")) run("del", () => api("/api/seo/autopost", { method: "DELETE", body: JSON.stringify({ id: it.id }) }), "Auto-posting stopped."); }}>
            Stop
          </Button>
        </div>
      </div>

      {it.paused_reason && <Alert variant={it.active ? "info" : "warning"}>{it.paused_reason}</Alert>}

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">How articles go live</p>
          <select value={it.mode} onChange={(e) => run("mode", () => api("/api/seo/autopost", { method: "PATCH", body: JSON.stringify({ id: it.id, mode: e.target.value }) }))} className="mt-0.5 h-8 rounded-md border border-border bg-background px-2 text-sm">
            <option value="auto">Automatically</option>
            <option value="first3">I review the first 3, then automatic</option>
            <option value="review">I review every article</option>
          </select>
        </div>
        <div><p className="text-xs text-muted-foreground">Articles published</p><p className="font-semibold">{it.posts_published}</p></div>
        <div>
          <p className="text-xs text-muted-foreground">Articles per day</p>
          <select value={it.posts_per_day} onChange={(e) => run("rate", () => api("/api/seo/autopost", { method: "PATCH", body: JSON.stringify({ id: it.id, postsPerDay: Number(e.target.value) }) }))} className="mt-0.5 h-8 rounded-md border border-border bg-background px-2 text-sm">
            <option value={1}>1</option><option value={2}>2</option>
          </select>
        </div>
        <div><p className="text-xs text-muted-foreground">Publishes around</p><p className="font-semibold">{it.publish_hours.map(localTime).join(" and ")}</p></div>
      </div>

      {it.pending.length > 0 && <ReviewQueue items={it.pending} onChanged={onChanged} onMessage={onMessage} />}

      {connected ? (
        <Alert variant="success" title="Search engines are told instantly">Every article is announced to Bing, Yandex, Naver, Seznam and Yep (IndexNow) the moment it is published. DuckDuckGo and Yahoo follow Bing.</Alert>
      ) : (
        <Alert variant="warning" title="One more step: tell search engines instantly (free)">
          <p>Articles are still published, but search engines will only find them through your sitemap, which is slower. IndexNow is free and takes about 2 minutes.</p>
          <Button size="sm" className="mt-2" variant="outline" onClick={() => setIxOpen(!ixOpen)}>{ixOpen ? "Hide steps" : "Set up IndexNow"}</Button>
        </Alert>
      )}
      {!connected && ixOpen && ixSite && (
        <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
          {ixSite.rankMath && (
            <div className="space-y-2 rounded-md bg-muted/50 p-3">
              <p className="font-semibold">Rank Math detected — the easiest way</p>
              <p className="text-xs text-muted-foreground">Rank Math has its own free Instant Indexing (IndexNow) feature, so you do not need to upload any file.</p>
              <ol className="list-decimal space-y-1 pl-5 text-xs">
                <li>In WordPress open <strong>Rank Math → Instant Indexing</strong> (turn the module on under Rank Math → Dashboard if you do not see it).</li>
                <li>Copy the <strong>API key</strong> shown in its Settings and paste it in the box below, then click Verify.</li>
              </ol>
            </div>
          )}
          <p className="font-semibold">{ixSite.rankMath ? "Or upload one small file instead" : "Upload one small file (no plugin needed)"}</p>
          {!ixSite.key ? (
            <Button size="sm" disabled={busy === "ix"} onClick={() => run("ix", () => api("/api/seo/indexnow", { method: "POST", body: JSON.stringify({ siteId: ixSite.id }) }))}>
              {busy === "ix" ? <Spinner size="sm" /> : "1. Create my key"}
            </Button>
          ) : (
            <ol className="list-decimal space-y-2 pl-5">
              <li><a className="font-semibold text-brand-600 underline" href={`/api/seo/indexnow/file?siteId=${ixSite.id}`}>Download the key file</a> ({ixSite.fileName}).</li>
              <li>Upload it to the <strong>root folder</strong> of {ixSite.siteUrl} (hosting File Manager or FTP, usually <code>public_html</code>) so it opens at <code>{ixSite.siteUrl.replace(/\/+$/, "")}/{ixSite.fileName}</code>.</li>
              <li>
                <Button size="sm" disabled={busy === "ixv"} onClick={() => run("ixv", () => api("/api/seo/indexnow", { method: "POST", body: JSON.stringify({ siteId: ixSite.id }) }))}>
                  {busy === "ixv" ? <><Spinner size="sm" /> Checking…</> : "Check connection"}
                </Button>
                {ixSite.error && <p className="mt-1 text-xs text-red-600">{ixSite.error}</p>}
              </li>
            </ol>
          )}
          <p className="pt-2 font-semibold">{ixSite.rankMath ? "Paste your Rank Math key" : "Already use Rank Math or an IndexNow plugin?"}</p>
          {ixSite.error && ixSite.key && <p className="text-xs text-red-600">{ixSite.error}</p>}
          <div className="flex gap-2">
            <Input value={pluginKey} onChange={(e) => setPluginKey(e.target.value)} placeholder="Paste the plugin's IndexNow key" />
            <Button size="sm" variant="outline" disabled={pluginKey.trim().length < 8 || busy === "ixk"} onClick={() => run("ixk", () => api("/api/seo/indexnow", { method: "POST", body: JSON.stringify({ siteId: ixSite.id, key: pluginKey.trim() }) }).then(() => setPluginKey("")))}>Verify</Button>
          </div>
        </div>
      )}

      {it.recent.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Recent activity</p>
          <ul className="space-y-1.5 text-sm">
            {it.recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 pb-1.5 last:border-0">
                <span>
                  {r.status === "published" ? "✅" : r.status === "unpublished" || r.status === "rejected" ? "⏸️" : r.status === "drafted" ? "📝" : "⚠️"}{" "}
                  {r.status === "published"
                    ? <>{r.post_url ? <a href={r.post_url} target="_blank" rel="noreferrer" className="font-medium underline">{r.title ?? "Published"}</a> : r.title}{r.words ? <span className="text-xs text-muted-foreground"> · {r.words.toLocaleString()} words</span> : null}</>
                    : <span className="text-muted-foreground">{r.message}</span>}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {r.status === "published" && r.article_id && (
                    <button type="button" disabled={busy !== null} className="underline hover:text-foreground"
                      onClick={() => { const id = r.article_id!; if (confirm("Unpublish this article? It goes back to a draft in WordPress. The credits used are not refunded.")) run("unpub", () => api("/api/seo/autopost/review/" + id, { method: "POST", body: JSON.stringify({ action: "unpublish" }) }), "Article unpublished."); }}>
                      Unpublish
                    </button>
                  )}
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
