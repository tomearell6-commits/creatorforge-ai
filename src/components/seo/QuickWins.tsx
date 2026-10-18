"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Win = {
  url: string; kind: "low_ctr" | "striking"; clicks: number; impressions: number; ctr: number; position: number;
  expectedCtr: number; potentialClicks: number; queries: { query: string; clicks: number; impressions: number; position: number }[];
};
type Found = { state: "ok"; wins: Win[]; canApply: boolean; free: boolean } | { state: "error"; message: string } | { state: "not_connected" | "no_property" | "reconnect" };
type Suggestion = { titles: string[]; description: string; notes: string; current: { title: string; description: string }; cached?: boolean; charged?: number };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const said = (j as { error?: string }).error;
    if (said) throw new Error(said);
    throw new Error(res.status === 504 || res.status === 502 ? "That took too long. Please try again." : "Something went wrong. Please try again in a moment.");
  }
  return j as T;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const path = (u: string) => { try { const p = new URL(u); return p.pathname === "/" ? p.hostname : p.pathname; } catch { return u; } };

function Count({ text, min, max }: { text: string; min: number; max: number }) {
  const n = text.trim().length;
  return <span className={`text-xs ${n >= min && n <= max ? "text-muted-foreground" : "text-amber-600"}`}>{n} characters (best {min}–{max})</span>;
}

function WinCard({ w, host, canApply, free }: { w: Win; host: string; canApply: boolean; free: boolean }) {
  const [sug, setSug] = useState<Suggestion | null>(null);
  const [busy, setBusy] = useState<"suggest" | "apply" | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  async function suggest() {
    setBusy("suggest"); setMsg(null);
    try {
      const r = await api<Suggestion & { state: string }>("/api/seo/gsc/suggest", { method: "POST", body: JSON.stringify({ host, url: w.url, queries: w.queries.map((q) => q.query) }) });
      setSug(r); setTitle(r.titles[0] ?? ""); setDesc(r.description);
      if (r.charged) setMsg({ kind: "success", text: `Suggestions ready (${r.charged} credits).` });
    } catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not get suggestions." }); }
    finally { setBusy(null); }
  }

  async function apply() {
    if (!confirm("Change this article's search title and description now? Its text and headline stay exactly as they are.")) return;
    setBusy("apply"); setMsg(null);
    try {
      const r = await api<{ indexnow?: string }>("/api/seo/gsc/apply", { method: "POST", body: JSON.stringify({ url: w.url, title, description: desc }) });
      setMsg({ kind: "success", text: `Updated. ${r.indexnow ?? ""}` });
    } catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not apply." }); }
    finally { setBusy(null); }
  }

  const copy = (text: string) => { void navigator.clipboard?.writeText(text); setMsg({ kind: "success", text: "Copied." }); };

  return (
    <li className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <a href={w.url} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold underline">{path(w.url)}</a>
          <p className="mt-1 text-xs text-muted-foreground">
            Shown <strong>{w.impressions.toLocaleString()}</strong> times, clicked <strong>{w.clicks}</strong> ({pct(w.ctr)}) at average position <strong>{w.position}</strong>
            {w.kind === "low_ctr" ? <> — pages at this position typically get about {pct(w.expectedCtr)}.</> : <> — just below the first page.</>}
          </p>
        </div>
        <Badge variant={w.kind === "low_ctr" ? "warning" : "info"}>{w.kind === "low_ctr" ? "Few clicks" : "Near page 1"}</Badge>
      </div>

      {w.queries.length > 0 && (
        <p className="text-xs text-muted-foreground">Found for: {w.queries.map((q) => `“${q.query}” (${q.impressions})`).join(" · ")}</p>
      )}

      {!sug ? (
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={suggest}>{busy === "suggest" ? <><Spinner size="sm" /> Writing…</> : free ? "Suggest a better title & description" : "Suggest a better title & description (2 credits)"}</Button>
      ) : (
        <div className="space-y-3 rounded-lg bg-muted/40 p-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Now</p>
            <p>{sug.current.title || "—"}</p>
            <p className="text-xs text-muted-foreground">{sug.current.description || "No description"}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Suggested title — pick one, or edit it</p>
            {sug.titles.map((t) => (
              <label key={t} className="flex cursor-pointer items-start gap-2"><input type="radio" name={`t-${w.url}`} checked={title === t} onChange={() => setTitle(t)} className="mt-1" /><span>{t}</span></label>
            ))}
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm" aria-label="Title" />
            <Count text={title} min={45} max={60} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Suggested description</p>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" aria-label="Description" />
            <Count text={desc} min={130} max={155} />
          </div>
          {sug.notes && <p className="text-xs text-muted-foreground">Why: {sug.notes}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => copy(title)}>Copy title</Button>
            <Button size="sm" variant="outline" onClick={() => copy(desc)}>Copy description</Button>
            {canApply && <Button size="sm" disabled={busy !== null || !title.trim()} onClick={apply}>{busy === "apply" ? <><Spinner size="sm" /> Applying…</> : "Apply to this article"}</Button>}
          </div>
          {!canApply && <p className="text-xs text-muted-foreground">Paste these into your SEO plugin (in Rank Math or Yoast: open the page, then “Edit snippet”). I do not change your site’s pages without you.</p>}
        </div>
      )}
      {msg && <Alert variant={msg.kind === "success" ? "success" : "error"}>{msg.text}</Alert>}
    </li>
  );
}

/** Pages Google already shows that could earn more clicks, with suggested rewrites you approve. */
export function QuickWins({ host, days }: { host: string; days: number }) {
  const [found, setFound] = useState<Found | null>(null);
  const [loading, setLoading] = useState(false);

  async function look() {
    setLoading(true);
    try { setFound(await api<Found>(`/api/seo/gsc/quickwins?host=${encodeURIComponent(host)}&days=${days}`)); }
    catch (e) { setFound({ state: "error", message: e instanceof Error ? e.message : "Could not look." }); }
    finally { setLoading(false); }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>Quick wins</CardTitle>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">Pages Google already shows, but that few people click, or that sit just below page 1. A clearer title and description often earns more clicks. Nothing is changed unless you approve it, and no result is promised.</p>
        </div>
        <Button size="sm" variant="outline" disabled={loading} onClick={look}>{loading ? <><Spinner size="sm" /> Looking…</> : found ? "Look again" : "Find quick wins"}</Button>
      </div>
      {found?.state === "error" && <Alert variant="error">{found.message}</Alert>}
      {found && found.state !== "ok" && found.state !== "error" && <Alert variant="warning">Reload the page and make sure this website is connected.</Alert>}
      {found?.state === "ok" && (found.wins.length === 0
        ? <p className="text-sm text-muted-foreground">No quick wins yet. This needs pages that Google has shown at least 20 times in this period, so brand-new pages and small sites often have none. Check again in a few weeks.</p>
        : <ul className="space-y-3">{found.wins.map((w) => <WinCard key={w.url} w={w} host={host} canApply={found.canApply} free={found.free} />)}</ul>)}
    </Card>
  );
}
