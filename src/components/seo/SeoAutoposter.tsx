"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type LogRow = { id: string; status: string; stage: string | null; message: string | null; title: string | null; post_url: string | null; words: number | null; created_at: string };
type Item = {
  id: string; wordpress_site_id: string; active: boolean; niche: string; posts_per_day: number; min_words: number;
  publish_hours: number[]; posts_published: number; paused_reason: string | null; last_success_at: string | null;
  queued_topics: number; monthly_credit_estimate: number;
  site: { id: string; site_name: string; site_url: string; indexnow_connected: boolean } | null;
  recent: LogRow[];
};
type Data = { plan: string; siteLimit: number; creditsPerPost: number; balance: number; items: Item[] };
type IxSite = { id: string; siteName: string; siteUrl: string; connected: boolean; key: string | null; fileName: string | null; error: string | null };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Something went wrong.");
  return j as T;
}

const localTime = (utcHour: number) =>
  new Date(Date.UTC(2000, 0, 1, utcHour)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function SeoAutoposter() {
  const [data, setData] = useState<Data | null>(null);
  const [ix, setIx] = useState<IxSite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [siteId, setSiteId] = useState("");
  const [niche, setNiche] = useState("");
  const [perDay, setPerDay] = useState<1 | 2>(1);
  const [ixOpen, setIxOpen] = useState<string | null>(null);
  const [pluginKey, setPluginKey] = useState("");

  const load = useCallback(async () => {
    try {
      const [d, i] = await Promise.all([api<Data>("/api/seo/autopost"), api<{ sites: IxSite[] }>("/api/seo/indexnow")]);
      setData(d); setIx(i.sites); setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run<T>(key: string, fn: () => Promise<T>, ok?: string) {
    setBusy(key); setMsg(null);
    try { await fn(); if (ok) setMsg({ kind: "success", text: ok }); await load(); }
    catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." }); }
    finally { setBusy(null); }
  }

  if (loadError) return <Alert variant="error" title="Could not load SEO Auto-Poster">{loadError}</Alert>;
  if (!data) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Loading…</div>;

  const used = new Set(data.items.map((i) => i.wordpress_site_id));
  const available = ix.filter((s) => !used.has(s.id));
  const atLimit = data.items.length >= data.siteLimit;

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div>
          <CardTitle>Automatic daily SEO posts</CardTitle>
          <CardDescription>Pick a website, tell us what it is about, and choose 1 or 2 posts a day. No dates or times to set — we handle the rest.</CardDescription>
        </div>
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-lg border border-border p-3"><strong>1,500+ words</strong><br />Structured H1/H2/H3 articles, written for readers worldwide, with a realistic AI image on every post.</li>
          <li className="rounded-lg border border-border p-3"><strong>Health-safe</strong><br />Medical topics get a disclaimer, trusted sources and no cure or treatment promises.</li>
          <li className="rounded-lg border border-border p-3"><strong>Announced to search engines</strong><br />Every post is sent via IndexNow to Bing, Yandex, Naver, Seznam and Yep (free, once connected).</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Each post uses {data.creditsPerPost} credits (article, image and publishing). Your balance: <strong>{data.balance.toLocaleString()}</strong> credits.
          Your plan allows {data.siteLimit} website{data.siteLimit === 1 ? "" : "s"}.
        </p>
      </Card>

      {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}

      {data.siteLimit === 0 && (
        <Alert variant="warning" title="Available on paid plans">
          Automatic daily posting uses credits every day, so it is included with paid plans. <Link href="/dashboard/billing" className="font-semibold underline">See plans</Link>
        </Alert>
      )}

      {data.siteLimit > 0 && ix.length === 0 && (
        <Alert variant="info" title="Connect a WordPress website first">
          Add your site with an Application Password, then come back here. <Link href="/dashboard/seo/sites" className="font-semibold underline">Connect a website</Link>
        </Alert>
      )}

      {data.siteLimit > 0 && ix.length > 0 && !atLimit && available.length > 0 && (
        <Card className="space-y-4">
          <CardTitle>Start auto-posting</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ap-site">Website</Label>
              <select id="ap-site" value={siteId} onChange={(e) => setSiteId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                <option value="">Choose a website…</option>
                {available.map((s) => <option key={s.id} value={s.id}>{s.siteName} — {s.siteUrl}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="ap-rate">Posts per day</Label>
              <select id="ap-rate" value={perDay} onChange={(e) => setPerDay(Number(e.target.value) === 2 ? 2 : 1)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                <option value={1}>1 post a day (about {data.creditsPerPost * 30} credits/month)</option>
                <option value={2}>2 posts a day (about {data.creditsPerPost * 60} credits/month)</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="ap-niche">What is this website about?</Label>
            <Input id="ap-niche" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. cardiology and heart-health education" />
            <p className="mt-1 text-xs text-muted-foreground">We plan topics and keywords for this subject, and never repeat what the site already published.</p>
          </div>
          <Button
            disabled={!siteId || niche.trim().length < 3 || busy === "add"}
            onClick={() => run("add", () => api("/api/seo/autopost", { method: "POST", body: JSON.stringify({ wordpressSiteId: siteId, niche, postsPerDay: perDay }) }).then(() => { setSiteId(""); setNiche(""); }), "Auto-posting is on. Your first post is published at the next scheduled time today.")}
          >
            {busy === "add" ? <><Spinner size="sm" /> Starting…</> : "Start auto-posting"}
          </Button>
        </Card>
      )}

      {data.siteLimit > 0 && atLimit && (
        <Alert variant="info">Your plan allows {data.siteLimit} auto-posted website{data.siteLimit === 1 ? "" : "s"}. <Link href="/dashboard/billing" className="font-semibold underline">Upgrade to add more</Link></Alert>
      )}

      {data.items.map((it) => {
        const ixSite = ix.find((s) => s.id === it.wordpress_site_id);
        const connected = !!it.site?.indexnow_connected;
        const status = !it.active ? { label: "Paused", variant: "warning" as const } : it.paused_reason?.startsWith("Waiting") ? { label: "Waiting", variant: "info" as const } : { label: "Active", variant: "success" as const };
        return (
          <Card key={it.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{it.site?.site_name ?? "Website"}</p>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{it.site?.site_url} · {it.niche}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy === `run-${it.id}` || !it.active} onClick={() => run(`run-${it.id}`, () => api<{ status: string; message: string }>("/api/seo/autopost/run", { method: "POST", body: JSON.stringify({ id: it.id }) }).then((r) => { if (r.status === "failed") throw new Error(r.message); if (r.status === "skipped") throw new Error(r.message); }), "Post published.")}>
                  {busy === `run-${it.id}` ? <><Spinner size="sm" /> Writing (2–3 min)…</> : "Post one now"}
                </Button>
                <Button size="sm" variant="outline" disabled={busy === `tog-${it.id}`} onClick={() => run(`tog-${it.id}`, () => api("/api/seo/autopost", { method: "PATCH", body: JSON.stringify({ id: it.id, active: !it.active }) }))}>
                  {it.active ? "Pause" : "Resume"}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy === `del-${it.id}`} onClick={() => { if (confirm("Stop auto-posting for this website? Existing posts stay online.")) run(`del-${it.id}`, () => api("/api/seo/autopost", { method: "DELETE", body: JSON.stringify({ id: it.id }) }), "Auto-posting removed."); }}>
                  Remove
                </Button>
              </div>
            </div>

            {it.paused_reason && <Alert variant={it.active ? "info" : "warning"}>{it.paused_reason}</Alert>}

            <div className="grid gap-3 text-sm sm:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">Posts published</p><p className="font-semibold">{it.posts_published}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Posts per day</p>
                <select value={it.posts_per_day} onChange={(e) => run(`rate-${it.id}`, () => api("/api/seo/autopost", { method: "PATCH", body: JSON.stringify({ id: it.id, postsPerDay: Number(e.target.value) }) }))} className="mt-0.5 h-8 rounded-md border border-border bg-background px-2 text-sm">
                  <option value={1}>1</option><option value={2}>2</option>
                </select>
              </div>
              <div><p className="text-xs text-muted-foreground">Publishes around</p><p className="font-semibold">{it.publish_hours.map(localTime).join(" and ")}</p></div>
              <div><p className="text-xs text-muted-foreground">Topics planned</p><p className="font-semibold">{it.queued_topics}</p></div>
            </div>

            {/* IndexNow — free; prompt the user to connect it when missing. */}
            {connected ? (
              <Alert variant="success" title="IndexNow connected">Every post is announced to Bing, Yandex, Naver, Seznam and Yep the moment it is published (DuckDuckGo and Yahoo follow Bing).</Alert>
            ) : (
              <Alert variant="warning" title="IndexNow is not connected for this website">
                <p>Posts are still published, but search engines will only discover them through your sitemap, which is slower. IndexNow is <strong>free</strong> — connecting it takes about 2 minutes.</p>
                <Button size="sm" className="mt-2" variant="outline" onClick={() => setIxOpen(ixOpen === it.id ? null : it.id)}>{ixOpen === it.id ? "Hide steps" : "Connect IndexNow"}</Button>
              </Alert>
            )}
            {!connected && ixOpen === it.id && ixSite && (
              <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
                <p className="font-semibold">Option 1 — upload one small file (no plugin needed)</p>
                {!ixSite.key ? (
                  <Button size="sm" disabled={busy === `ix-${it.id}`} onClick={() => run(`ix-${it.id}`, () => api("/api/seo/indexnow", { method: "POST", body: JSON.stringify({ siteId: ixSite.id }) }))}>
                    {busy === `ix-${it.id}` ? <Spinner size="sm" /> : "1. Create my key"}
                  </Button>
                ) : (
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>
                      <a className="font-semibold text-brand-600 underline" href={`/api/seo/indexnow/file?siteId=${ixSite.id}`}>Download the key file</a> ({ixSite.fileName}).
                    </li>
                    <li>Upload it to the <strong>root folder</strong> of {ixSite.siteUrl} (in your hosting File Manager or FTP — usually <code>public_html</code>), so that it opens at <code>{ixSite.siteUrl.replace(/\/+$/, "")}/{ixSite.fileName}</code>.</li>
                    <li>
                      <Button size="sm" disabled={busy === `ixv-${it.id}`} onClick={() => run(`ixv-${it.id}`, () => api("/api/seo/indexnow", { method: "POST", body: JSON.stringify({ siteId: ixSite.id }) }))}>
                        {busy === `ixv-${it.id}` ? <><Spinner size="sm" /> Checking…</> : "Check connection"}
                      </Button>
                      {ixSite.error && <p className="mt-1 text-xs text-red-600">{ixSite.error}</p>}
                    </li>
                  </ol>
                )}
                <p className="pt-2 font-semibold">Option 2 — you already use an IndexNow plugin</p>
                <p className="text-xs text-muted-foreground">Paste the key from the plugin (Rank Math, Yoast, AIOSEO or Microsoft&rsquo;s IndexNow plugin). Its key file must already open at your site&rsquo;s /key.txt address.</p>
                <div className="flex gap-2">
                  <Input value={pluginKey} onChange={(e) => setPluginKey(e.target.value)} placeholder="Paste your IndexNow key" />
                  <Button size="sm" variant="outline" disabled={pluginKey.trim().length < 8 || busy === `ixk-${it.id}`} onClick={() => run(`ixk-${it.id}`, () => api("/api/seo/indexnow", { method: "POST", body: JSON.stringify({ siteId: ixSite.id, key: pluginKey.trim() }) }).then(() => setPluginKey("")))}>Verify</Button>
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
                        {r.status === "published" ? "✅" : "⚠️"}{" "}
                        {r.status === "published"
                          ? <>{r.post_url ? <a href={r.post_url} target="_blank" rel="noreferrer" className="font-medium underline">{r.title ?? "Published"}</a> : r.title}{r.words ? <span className="text-xs text-muted-foreground"> · {r.words.toLocaleString()} words</span> : null}</>
                          : <span className="text-muted-foreground">{r.message}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        );
      })}

      <p className="text-xs text-muted-foreground">
        IndexNow is free and speeds up discovery on Bing, Yandex, Naver, Seznam and Yep; DuckDuckGo and Yahoo build on Bing&rsquo;s index. Google does not use IndexNow and finds posts through your sitemap.
        No tool can guarantee a page will be indexed — steady, high-quality publishing is what earns it.
      </p>
    </div>
  );
}
