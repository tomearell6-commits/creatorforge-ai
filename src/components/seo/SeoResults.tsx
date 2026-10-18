"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Site = { host: string; name: string; url: string; kind: "wordpress" | "blog" };
type Conn = { id: string; email: string; status: string; error: string | null };
type Boot = { configured: boolean; connections: Conn[]; sites: Site[] };
type Totals = { clicks: number; impressions: number; ctr: number; position: number };
type Article = { title: string; url: string; publishedAt: string | null; clicks: number; impressions: number; position: number | null; daysLive: number | null };
type Overview =
  | { state: "ok"; site: Site; property: string; account: string; range: { start: string; end: string; days: number }; totals: Totals; previous: Totals; change: { clicks: number | null; impressions: number | null };
      series: { date: string; clicks: number; impressions: number }[]; queries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[]; articles: Article[]; fetchedAt: string; cached?: boolean }
  | { state: "not_connected" }
  | { state: "no_property"; properties: string[] }
  | { state: "reconnect"; message: string }
  | { state: "error"; message: string };
type Inspect = { verdict: string; state: string; indexed: boolean } | { error: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error || "Something went wrong.");
  return j as T;
}

const nf = (n: number) => n.toLocaleString();
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function Change({ v }: { v: number | null }) {
  if (v === null) return <span className="text-xs text-muted-foreground">new</span>;
  const up = v >= 0;
  return <span className={`text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "▲" : "▼"} {Math.abs(v)}%</span>;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <div className="mt-0.5 min-h-4">{sub}</div>
    </div>
  );
}

/** A small line/area chart in plain SVG (no chart library). */
function Chart({ title, points, color }: { title: string; points: { date: string; v: number }[]; color: string }) {
  const W = 360, H = 90, P = 4;
  const max = Math.max(1, ...points.map((p) => p.v));
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, points.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${x(points.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z` : "";
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">peak {nf(max === 1 && points.every((p) => p.v === 0) ? 0 : max)}</p></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`${title} by day`}>
        <path d={area} fill={color} opacity="0.12" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{points[0]?.date}</span><span>{points[points.length - 1]?.date}</span></div>
    </div>
  );
}

/** Plain-language reading of the numbers. Never promises anything. */
function Reading({ o }: { o: Extract<Overview, { state: "ok" }> }) {
  const live = o.articles.filter((a) => a.daysLive !== null);
  const youngest = live.length ? Math.min(...live.map((a) => a.daysLive as number)) : null;
  const t = o.totals;
  let text: string;
  if (t.impressions === 0) {
    text = youngest !== null && youngest < 14
      ? "No search appearances yet. That is normal: a new page usually takes days to weeks for Google to find and index, and longer to rank. Check back in a week."
      : "Google has not shown this site in search results during this period. Check that the sitemap is submitted in Search Console and that your pages are indexed (use “Check indexing” below).";
  } else if (t.clicks === 0) {
    text = "Your pages are starting to appear in Google, but nobody has clicked yet. Early on this is common: pages often show up deep in the results first. Clear titles and descriptions help, and so does time.";
  } else if (t.position > 20) {
    text = "You are getting some visits, but on average your pages sit beyond the second page of results. Rankings tend to improve slowly as Google learns the site; keep publishing and check again in a few weeks.";
  } else {
    text = "Your pages are appearing in search and getting clicks. Watch which searches bring visitors (below) and write more on those subjects.";
  }
  return <Alert variant="info" title="What this means">{text} <span className="text-xs">Google’s figures run about two days behind. Nobody can guarantee a ranking, and this page only shows what Google reports.</span></Alert>;
}

export function SeoResults() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [host, setHost] = useState("");
  const [days, setDays] = useState(28);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [inspected, setInspected] = useState<Record<string, Inspect>>({});
  const [inspecting, setInspecting] = useState(false);

  const loadBoot = useCallback(async () => {
    try {
      const b = await api<Boot>("/api/seo/gsc");
      setBoot(b);
      setHost((h) => h || b.sites[0]?.host || "");
    } catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not load." }); }
  }, []);

  useEffect(() => {
    void loadBoot();
    const q = new URLSearchParams(window.location.search);
    if (q.get("gsc") === "connected") setMsg({ kind: "success", text: "Google connected. Your results will appear below." });
    else if (q.get("gsc") === "error") {
      const why = q.get("reason");
      setMsg({ kind: "error", text: why === "access_denied" ? "You cancelled the Google sign-in. Nothing was connected."
        : why === "no_refresh_token" ? "Google did not give a lasting login. Remove this app at myaccount.google.com/permissions and connect again."
        : why === "scope" ? "Search Console access was not granted. On the Google screen, tick the Search Console permission and try again."
        : "Could not connect Google. Please try again." });
    }
  }, [loadBoot]);

  const load = useCallback(async (refresh = false) => {
    if (!host) return;
    setLoading(true);
    try { setData(await api<Overview>(`/api/seo/gsc/overview?host=${encodeURIComponent(host)}&days=${days}${refresh ? "&refresh=1" : ""}`)); }
    catch (e) { setData({ state: "error", message: e instanceof Error ? e.message : "Could not load results." }); }
    finally { setLoading(false); }
  }, [host, days]);

  useEffect(() => { if (boot?.connections.length) void load(); else setData(null); }, [boot, load]);

  async function connect() {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ available: boolean; authorizeUrl?: string; message?: string }>("/api/seo/gsc/connect", { method: "POST" });
      if (!r.available || !r.authorizeUrl) { setMsg({ kind: "error", text: r.message ?? "Not available." }); return; }
      window.location.href = r.authorizeUrl;
    } catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not start." }); }
    finally { setBusy(false); }
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this Google account? Its saved login is deleted. You can connect again at any time.")) return;
    try { await api("/api/seo/gsc", { method: "DELETE", body: JSON.stringify({ id }) }); await loadBoot(); setData(null); setMsg({ kind: "success", text: "Disconnected." }); }
    catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not disconnect." }); }
  }

  async function checkIndexing(urls: string[]) {
    setInspecting(true);
    try {
      const r = await api<{ state: string; results?: Record<string, Inspect> }>("/api/seo/gsc/inspect", { method: "POST", body: JSON.stringify({ host, urls: urls.slice(0, 10) }) });
      if (r.results) setInspected((prev) => ({ ...prev, ...r.results }));
    } catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not check." }); }
    finally { setInspecting(false); }
  }

  if (!boot) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Loading…</div>;

  const connected = boot.connections.length > 0;
  const site = boot.sites.find((s) => s.host === host);

  return (
    <div className="space-y-6">
      {msg && <Alert variant={msg.kind === "success" ? "success" : "error"}>{msg.text}</Alert>}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Google Search Console</CardTitle>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              See what Google itself reports for your websites: how often they appear in search, who clicks, and whether each article is indexed. The connection is <strong>read-only</strong>: we can look, never change anything. Your login is stored encrypted and you can disconnect at any time.
            </p>
          </div>
          <Button size="sm" disabled={busy || !boot.configured} onClick={connect}>{busy ? <Spinner size="sm" /> : connected ? "Add another Google account" : "Connect Google Search Console"}</Button>
        </div>
        {!boot.configured && <Alert variant="warning">Search Console isn’t set up on this server yet (the Google keys are missing).</Alert>}
        {connected && (
          <ul className="space-y-1.5 text-sm">
            {boot.connections.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{c.email} <Badge variant={c.status === "connected" ? "success" : "warning"}>{c.status === "connected" ? "Connected" : "Needs reconnecting"}</Badge>{c.error ? <span className="ml-2 text-xs text-red-600">{c.error}</span> : null}</span>
                <button type="button" className="text-xs text-muted-foreground underline hover:text-foreground" onClick={() => disconnect(c.id)}>Disconnect</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {boot.sites.length === 0 ? (
        <Alert variant="info" title="No websites yet">Start SEO Autopilot on a website first. Its results will appear here once Google has data for it.</Alert>
      ) : connected && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="gsc-site" className="text-xs text-muted-foreground">Website</label>
              <select id="gsc-site" value={host} onChange={(e) => { setHost(e.target.value); setInspected({}); }} className="mt-0.5 block h-10 rounded-lg border border-border bg-background px-3 text-sm">
                {boot.sites.map((s) => <option key={s.host} value={s.host}>{s.name} — {s.host}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="gsc-days" className="text-xs text-muted-foreground">Period</label>
              <select id="gsc-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-0.5 block h-10 rounded-lg border border-border bg-background px-3 text-sm">
                <option value={7}>Last 7 days</option><option value={28}>Last 28 days</option><option value={90}>Last 90 days</option>
              </select>
            </div>
            <Button size="sm" variant="outline" disabled={loading} onClick={() => load(true)}>{loading ? <Spinner size="sm" /> : "Refresh"}</Button>
          </div>

          {loading && !data && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Asking Google…</div>}

          {data?.state === "reconnect" && <Alert variant="warning" title="Reconnect Google">{data.message}</Alert>}
          {data?.state === "error" && <Alert variant="error">{data.message}</Alert>}

          {data?.state === "no_property" && (
            <Card className="space-y-3">
              <CardTitle>{site?.name} isn’t in your Search Console yet</CardTitle>
              <p className="text-sm text-muted-foreground">None of your connected Google accounts has <strong>{host}</strong> as a verified website. Google only shares results for sites whose owner has verified them. It takes about 5 minutes:</p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                <li>Open <a className="font-semibold text-brand-600 underline" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Google Search Console</a> with the Google account you connected, and click <strong>Add property</strong>.</li>
                <li>Enter <code>{site?.url}</code> and verify ownership (the easiest ways are a DNS record or an HTML tag; Search Console walks you through it).</li>
                <li>Open <strong>Sitemaps</strong> and submit <code>{`https://${host}/sitemap.xml`}</code>.</li>
                <li>Come back here and click <strong>Refresh</strong>. Google needs a few days to collect data for a newly added site.</li>
              </ol>
              {data.properties.length > 0 && <p className="text-xs text-muted-foreground">Properties found in your connected accounts: {data.properties.join(", ")}</p>}
            </Card>
          )}

          {data?.state === "ok" && (
            <>
              <p className="text-xs text-muted-foreground">
                {data.site.name} · property <code>{data.property}</code> · {data.range.start} to {data.range.end} · from {data.account}{data.cached ? " · saved copy, press Refresh for the latest" : ""}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Clicks from Google" value={nf(data.totals.clicks)} sub={<Change v={data.change.clicks} />} />
                <Stat label="Times shown in search" value={nf(data.totals.impressions)} sub={<Change v={data.change.impressions} />} />
                <Stat label="Click rate" value={data.totals.impressions ? pct(data.totals.ctr) : "–"} />
                <Stat label="Average position" value={data.totals.impressions ? data.totals.position.toFixed(1) : "–"} sub={<span className="text-xs text-muted-foreground">lower is better</span>} />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <Chart title="Times shown in search" color="#3b82f6" points={data.series.map((s) => ({ date: s.date, v: s.impressions }))} />
                <Chart title="Clicks" color="#16a34a" points={data.series.map((s) => ({ date: s.date, v: s.clicks }))} />
              </div>
              <Reading o={data} />

              <Card className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><CardTitle>Your Autopilot articles</CardTitle><p className="mt-1 text-xs text-muted-foreground">Results for the articles published for you, newest first.</p></div>
                  {data.articles.length > 0 && (
                    <Button size="sm" variant="outline" disabled={inspecting} onClick={() => checkIndexing(data.articles.map((a) => a.url))}>{inspecting ? <><Spinner size="sm" /> Asking Google…</> : "Check indexing (latest 10)"}</Button>
                  )}
                </div>
                {data.articles.length === 0 ? <p className="text-sm text-muted-foreground">No published articles yet for this website.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-muted-foreground"><tr><th className="py-2 pr-3">Article</th><th className="pr-3">Live</th><th className="pr-3 text-right">Shown</th><th className="pr-3 text-right">Clicks</th><th className="pr-3 text-right">Position</th><th>In Google?</th></tr></thead>
                      <tbody className="divide-y divide-border/60">
                        {data.articles.map((a) => {
                          const i = inspected[a.url];
                          return (
                            <tr key={a.url}>
                              <td className="max-w-xs py-2 pr-3"><a href={a.url} target="_blank" rel="noreferrer" className="font-medium underline">{a.title}</a></td>
                              <td className="pr-3 whitespace-nowrap text-muted-foreground">{a.daysLive === null ? "–" : a.daysLive === 0 ? "today" : `${a.daysLive}d`}</td>
                              <td className="pr-3 text-right">{nf(a.impressions)}</td>
                              <td className="pr-3 text-right">{nf(a.clicks)}</td>
                              <td className="pr-3 text-right">{a.position ?? "–"}</td>
                              <td>{!i ? <span className="text-xs text-muted-foreground">–</span> : "error" in i ? <span className="text-xs text-red-600" title={i.error}>couldn’t check</span> : <Badge variant={i.indexed ? "success" : "warning"}>{i.indexed ? "Indexed" : "Not yet"}</Badge>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {Object.values(inspected).some((i) => !("error" in i) && !i.indexed) && <p className="text-xs text-muted-foreground">“Not yet” is common for new pages: Google usually takes days to weeks to add a new page. Hover is not needed; a submitted sitemap and IndexNow speed up discovery, but Google decides when to index.</p>}
              </Card>

              <Card className="space-y-3">
                <CardTitle>What people searched to find you</CardTitle>
                {data.queries.length === 0 ? <p className="text-sm text-muted-foreground">No searches yet in this period.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-muted-foreground"><tr><th className="py-2 pr-3">Search</th><th className="pr-3 text-right">Shown</th><th className="pr-3 text-right">Clicks</th><th className="pr-3 text-right">Click rate</th><th className="text-right">Position</th></tr></thead>
                      <tbody className="divide-y divide-border/60">
                        {data.queries.map((q) => (
                          <tr key={q.query}><td className="py-2 pr-3">{q.query}</td><td className="pr-3 text-right">{nf(q.impressions)}</td><td className="pr-3 text-right">{nf(q.clicks)}</td><td className="pr-3 text-right">{pct(q.ctr)}</td><td className="text-right">{q.position}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
