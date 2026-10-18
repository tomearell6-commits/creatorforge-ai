"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { AutopilotSiteCard, api, type AutopostItem, type IxSite } from "./AutopilotSiteCard";

type Brand = { name?: string; summary?: string; niche?: string; offerings?: string[]; audience?: string; tone?: string; country?: string; language?: string };
type Project = { id: string; website_url: string; name: string; status: "new" | "analyzing" | "ready" | "failed"; progress: string | null; error: string | null; brand: Brand; analyzed_at: string | null };
type Full = Project & {
  language: string;
  competitors: { domain: string; rank: number; topPage: string; whyTheyRank: string }[];
  keywords: { keyword: string; intent: string; why: string }[];
  gaps: string[];
  plan: { day: number; title: string; keyword: string; secondaryKeywords: string[]; intent: string; angle: string }[];
};
type AutopostData = { plan: string; siteLimit: number; creditsPerPost: number; balance: number; items: AutopostItem[] };
type Msg = { kind: "success" | "error" | "info"; text: string };

const STEPS = [
  "Reading your website…",
  "Learning your brand and customers…",
  "Finding your real competitors on Google…",
  "Studying the pages that rank at the top…",
  "Building your 30-day content plan…",
];

const bare = (u: string) => { try { return new URL(u.startsWith("http") ? u : `https://${u}`).hostname.replace(/^www\./, ""); } catch { return u; } };
const isBuyer = (intent: string) => /transaction|commercial/i.test(intent);

export function SeoAutopilot() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [meta, setMeta] = useState({ analysisCredits: 15, balance: 0 });
  const [ap, setAp] = useState<AutopostData | null>(null);
  const [ix, setIx] = useState<IxSite[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [starting, setStarting] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, a, i] = await Promise.all([
        api<{ projects: Project[]; analysisCredits: number; balance: number }>("/api/seo/projects"),
        api<AutopostData>("/api/seo/autopost"),
        api<{ sites: IxSite[] }>("/api/seo/indexnow"),
      ]);
      setProjects(p.projects); setMeta({ analysisCredits: p.analysisCredits, balance: p.balance }); setAp(a); setIx(i.sites); setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // While an analysis is running, check on it every few seconds.
  const analyzing = !!projects?.some((p) => p.status === "analyzing");
  useEffect(() => {
    if (!analyzing) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [analyzing, load]);

  async function analyze() {
    setStarting(true); setMsg(null);
    try {
      const r = await api<{ project: { id: string } }>("/api/seo/projects", { method: "POST", body: JSON.stringify({ url }) });
      setUrl(""); setSelected(r.project.id); await load();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not start." });
    } finally { setStarting(false); }
  }

  if (loadError) return <Alert variant="error" title="Could not load SEO Autopilot">{loadError}</Alert>;
  if (!projects || !ap) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Loading…</div>;

  const selectedProject = projects.find((p) => p.id === selected) ?? null;

  const addForm = (big: boolean) => (
    <div className={big ? "mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row" : "flex flex-col gap-3 sm:flex-row"}>
      <Input
        value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Your website address"
        onKeyDown={(e) => { if (e.key === "Enter" && url.trim() && !starting) analyze(); }}
        placeholder="https://yourwebsite.com" className={big ? "h-12 text-base" : ""}
      />
      <Button disabled={!url.trim() || starting} onClick={analyze} className={big ? "h-12 px-6 text-base" : ""}>
        {starting ? <><Spinner size="sm" /> Starting…</> : "Analyze my website →"}
      </Button>
    </div>
  );

  if (selectedProject) {
    return (
      <div className="space-y-4">
        <button className="text-sm font-semibold text-brand-600 hover:underline" onClick={() => { setSelected(null); setMsg(null); }}>← All websites</button>
        {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
        <ProjectView project={selectedProject} ap={ap} ix={ix} meta={meta} reload={load} setMsg={setMsg} reanalyze={async (u) => { setUrl(u); await api("/api/seo/projects", { method: "POST", body: JSON.stringify({ url: u }) }); await load(); }} />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-10 py-6 text-center">
        {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
        <div className="space-y-4">
          <h2 className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">Get found on Google, Bing and AI search — on autopilot</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">Type your website address. We study your business and your competitors, build a 30-day plan, and publish an expert article every day.</p>
        </div>
        {addForm(true)}
        <p className="text-xs text-muted-foreground">The analysis takes about 2 minutes and costs {meta.analysisCredits} credits. You see the full plan before anything is published.</p>
        <div className="mx-auto grid max-w-4xl gap-3 text-left sm:grid-cols-3">
          {[
            ["1", "Add your website", "We read your site and learn what you sell and who buys it."],
            ["2", "Get your plan", "We find who really ranks for your keywords and plan 30 days of better articles."],
            ["3", "Publish every day", "Connect WordPress once. An article with a real image goes live daily."],
          ].map(([n, t, d]) => (
            <Card key={n} className="p-4"><div className="text-xs font-bold text-brand-600">Step {n}</div><div className="mt-1 font-semibold">{t}</div><p className="mt-1 text-sm text-muted-foreground">{d}</p></Card>
          ))}
        </div>
        <p className="mx-auto max-w-2xl text-xs text-muted-foreground">
          No one can promise a ranking. What we can do is publish consistent, well-researched, properly structured articles built around what already ranks, and tell search engines the moment they are live.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
      <Card className="space-y-3">
        <CardTitle>Add a website</CardTitle>
        {addForm(false)}
        <p className="text-xs text-muted-foreground">Analysis takes about 2 minutes and costs {meta.analysisCredits} credits. Your balance: {meta.balance.toLocaleString()} credits.</p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((p) => {
          const running = ap.items.find((i) => i.project_id === p.id);
          return (
            <button key={p.id} onClick={() => setSelected(p.id)} className="text-left">
              <Card className="h-full space-y-2 p-4 transition hover:border-brand-600">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{p.name || bare(p.website_url)}</p>
                  {p.status === "analyzing" ? <Badge variant="info">Analyzing…</Badge>
                    : p.status === "failed" ? <Badge variant="warning">Needs a retry</Badge>
                    : running ? <Badge variant={running.active ? "success" : "warning"}>{running.active ? "Posting daily" : "Paused"}</Badge>
                    : <Badge variant="default">Plan ready</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{bare(p.website_url)}</p>
                {p.brand?.summary && <p className="line-clamp-2 text-sm text-muted-foreground">{p.brand.summary}</p>}
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProjectView({ project, ap, ix, meta, reload, setMsg, reanalyze }: {
  project: Project; ap: AutopostData; ix: IxSite[]; meta: { analysisCredits: number; balance: number };
  reload: () => Promise<void>; setMsg: (m: Msg | null) => void; reanalyze: (url: string) => Promise<void>;
}) {
  const [full, setFull] = useState<Full | null>(null);
  const [siteId, setSiteId] = useState("");
  const [perDay, setPerDay] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [connect, setConnect] = useState({ username: "", appPassword: "" });
  const item = ap.items.find((i) => i.project_id === project.id);

  useEffect(() => {
    if (project.status !== "ready") { setFull(null); return; }
    api<{ project: Full }>(`/api/seo/projects/${project.id}`).then((r) => setFull(r.project)).catch(() => setFull(null));
  }, [project.id, project.status, project.analyzed_at]);

  // Preselect the WordPress site that matches this website.
  useEffect(() => {
    if (siteId) return;
    const match = ix.find((s) => bare(s.siteUrl) === bare(project.website_url));
    if (match) setSiteId(match.id);
  }, [ix, project.website_url, siteId]);

  if (project.status === "analyzing") {
    const at = Math.max(0, STEPS.indexOf(project.progress ?? ""));
    return (
      <Card className="space-y-4 p-6">
        <div><CardTitle>Studying {bare(project.website_url)}…</CardTitle><p className="mt-1 text-sm text-muted-foreground">This takes about 2 minutes. You can leave this page and come back — it keeps working.</p></div>
        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2 text-sm">
              {i < at ? <span className="text-emerald-600">✔</span> : i === at ? <Spinner size="sm" /> : <span className="text-muted-foreground">○</span>}
              <span className={i > at ? "text-muted-foreground" : ""}>{s.replace("…", "")}</span>
            </li>
          ))}
        </ol>
      </Card>
    );
  }

  if (project.status === "failed") {
    return (
      <Card className="space-y-3 p-6">
        <Alert variant="error" title="We couldn't finish the analysis">{project.error ?? "Something went wrong."} No credits were charged.</Alert>
        <Button onClick={() => reanalyze(project.website_url)}>Try again</Button>
      </Card>
    );
  }

  if (!full) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Loading your plan…</div>;

  const b = full.brand;
  const done = item?.posts_published ?? 0;
  const atLimit = !item && ap.items.length >= ap.siteLimit;

  async function connectSite() {
    setBusy(true); setMsg(null);
    try {
      await api("/api/wordpress/sites", { method: "POST", body: JSON.stringify({ siteName: b.name || bare(full!.website_url), siteUrl: full!.website_url, username: connect.username, appPassword: connect.appPassword, defaultCategory: "" }) });
      setConnect({ username: "", appPassword: "" });
      await reload();
      setMsg({ kind: "success", text: "WordPress connected." });
    } catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not connect." }); }
    finally { setBusy(false); }
  }

  async function start() {
    setBusy(true); setMsg(null);
    try {
      await api("/api/seo/autopost", { method: "POST", body: JSON.stringify({ projectId: full!.id, wordpressSiteId: siteId, postsPerDay: perDay }) });
      await reload();
      setMsg({ kind: "success", text: "Daily posting is on. Your first article is published at the next scheduled time today." });
    } catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not start." }); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{b.name || bare(full.website_url)}</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Re-analyze this website? It costs ${meta.analysisCredits} credits.`)) reanalyze(full.website_url); }}>Re-analyze</Button>
        </div>
        <p className="text-sm text-muted-foreground">{b.summary}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {(b.offerings ?? []).slice(0, 6).map((o) => <span key={o} className="rounded-full bg-muted px-3 py-1 text-xs">{o}</span>)}
        </div>
        <p className="text-xs text-muted-foreground">
          {b.audience ? <>For: {b.audience}. </> : null}Voice: {b.tone ?? "professional"} · Language: {full.language.toUpperCase()}{b.country ? ` · Market: ${b.country.toUpperCase()}` : " · Worldwide"}
        </p>
      </Card>

      {item && <AutopilotSiteCard it={item} ixSite={ix.find((s) => s.id === item.wordpress_site_id)} onChanged={reload} onMessage={(m) => setMsg(m)} />}

      <Card className="space-y-3">
        <div>
          <CardTitle>Your 30-day content plan</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Each article targets a real search phrase and is planned to cover the topic more completely than the pages that rank today.</p>
        </div>
        <ol className="divide-y divide-border/60">
          {full.plan.map((p) => (
            <li key={p.day} className="flex gap-3 py-2.5">
              <span className={`mt-0.5 w-8 shrink-0 text-right text-xs font-semibold ${p.day <= done ? "text-emerald-600" : "text-muted-foreground"}`}>{p.day <= done ? "✔" : `Day ${p.day}`}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">Target: <span className="font-medium">{p.keyword}</span> · <span className={isBuyer(p.intent) ? "font-semibold text-brand-600" : ""}>{isBuyer(p.intent) ? "buyer intent" : p.intent}</span></p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {!item && (
        <Card className="space-y-4 border-brand-600">
          <div><CardTitle>Start publishing every day</CardTitle><p className="mt-1 text-sm text-muted-foreground">Connect your WordPress site once. We publish the plan above, one article a day, with a real image and instant search-engine notice.</p></div>

          {ap.siteLimit === 0 && <Alert variant="warning" title="Daily publishing is on paid plans">The analysis and plan are yours to keep. <Link href="/dashboard/billing" className="font-semibold underline">See plans</Link> to switch on daily publishing.</Alert>}
          {ap.siteLimit > 0 && atLimit && <Alert variant="info">Your plan allows {ap.siteLimit} auto-posted website{ap.siteLimit === 1 ? "" : "s"}. <Link href="/dashboard/billing" className="font-semibold underline">Upgrade to add more</Link></Alert>}

          {ap.siteLimit > 0 && !atLimit && (
            <>
              {ix.length > 0 && (
                <div>
                  <Label htmlFor="ap-wp">WordPress site</Label>
                  <select id="ap-wp" value={siteId} onChange={(e) => setSiteId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                    <option value="">Choose your site…</option>
                    {ix.map((s) => <option key={s.id} value={s.id}>{s.siteName} — {s.siteUrl}</option>)}
                  </select>
                </div>
              )}
              {!siteId && (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold">{ix.length > 0 ? "Or connect this website" : "Connect your WordPress site"}</p>
                  <p className="text-xs text-muted-foreground">In WordPress open <strong>Users → Profile → Application Passwords</strong>, create one called “CreatorsForge”, and paste it here. It is stored encrypted, and we never see your normal password.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label htmlFor="wp-user">WordPress username</Label><Input id="wp-user" value={connect.username} onChange={(e) => setConnect({ ...connect, username: e.target.value })} /></div>
                    <div><Label htmlFor="wp-pass">Application password</Label><Input id="wp-pass" value={connect.appPassword} onChange={(e) => setConnect({ ...connect, appPassword: e.target.value })} placeholder="xxxx xxxx xxxx xxxx" /></div>
                  </div>
                  <Button size="sm" variant="outline" disabled={busy || !connect.username.trim() || !connect.appPassword.trim()} onClick={connectSite}>{busy ? <><Spinner size="sm" /> Checking…</> : "Connect WordPress"}</Button>
                </div>
              )}
              <div>
                <Label htmlFor="ap-rate">Articles per day</Label>
                <select id="ap-rate" value={perDay} onChange={(e) => setPerDay(Number(e.target.value) === 2 ? 2 : 1)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-72">
                  <option value={1}>1 a day (about {ap.creditsPerPost * 30} credits a month)</option>
                  <option value={2}>2 a day (about {ap.creditsPerPost * 60} credits a month)</option>
                </select>
              </div>
              <Button disabled={!siteId || busy} onClick={start}>{busy ? <><Spinner size="sm" /> Starting…</> : "Start daily publishing"}</Button>
              <p className="text-xs text-muted-foreground">Each article uses {ap.creditsPerPost} credits. Your balance: {ap.balance.toLocaleString()}. You can pause or stop at any time.</p>
            </>
          )}
        </Card>
      )}

      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-semibold">See the research behind the plan</summary>
        <div className="mt-4 space-y-6 text-sm">
          <div>
            <p className="font-semibold">Who ranks for your keywords today</p>
            <ul className="mt-2 space-y-2">
              {full.competitors.map((c) => (
                <li key={c.domain}><span className="font-medium">{c.domain}</span> <span className="text-xs text-muted-foreground">(best position seen: {c.rank})</span>{c.whyTheyRank ? <p className="text-muted-foreground">{c.whyTheyRank}</p> : null}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">Keywords worth winning</p>
            <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {full.keywords.map((k) => <li key={k.keyword}><span className="font-medium">{k.keyword}</span> <span className="text-xs text-muted-foreground">· {isBuyer(k.intent) ? "buyer intent" : k.intent}</span></li>)}
            </ul>
          </div>
          {full.gaps.length > 0 && (
            <div>
              <p className="font-semibold">What top pages cover that your site does not (yet)</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{full.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Rankings come from live search results at the time of analysis. We do not show search-volume numbers because they need a paid data source, and no analysis can guarantee a position.</p>
        </div>
      </details>
    </div>
  );
}
