"use client";

import { useEffect, useState } from "react";
import { Search, Monitor, Tablet, Smartphone, Star, History as HistoryIcon, Sparkles, X, RefreshCw, Camera } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { ASSISTANT_ACTIONS, DEVICE_PRESETS, type InspectionReport, type AssistantAction } from "@/lib/browser/types";

type Bookmark = { id: string; url: string; title: string | null };
type HistoryItem = { id: string; url: string; title: string | null; seo_score: number | null; visited_at: string };
type Shot = { id: string; url: string; kind: string; image_url: string; width: number | null; created_at: string };
type Device = (typeof DEVICE_PRESETS)[number]["id"];
type Tab = "inspector" | "preview" | "social";

const SEV = { critical: "danger", warning: "warning", passed: "success" } as const;

export function BrowserStudio() {
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [tab, setTab] = useState<Tab>("inspector");
  const [msg, setMsg] = useState<string | null>(null);

  const [assistantOpen, setAssistantOpen] = useState(true);
  const [answer, setAnswer] = useState<string>("");
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [shotConfigured, setShotConfigured] = useState(true);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => { loadSide(); }, []);
  async function loadSide() {
    const [b, h, s] = await Promise.all([
      fetch("/api/browser/bookmarks").then((r) => r.json()).catch(() => ({ bookmarks: [] })),
      fetch("/api/browser/history").then((r) => r.json()).catch(() => ({ history: [] })),
      fetch("/api/browser/screenshot").then((r) => r.json()).catch(() => ({ screenshots: [], configured: true })),
    ]);
    setBookmarks(b.bookmarks ?? []); setHistory(h.history ?? []);
    setShots(s.screenshots ?? []); setShotConfigured(s.configured !== false);
  }

  async function capture(fullPage: boolean) {
    if (!report?.ok) { setMsg("Inspect a page first."); return; }
    setCapturing(true); setMsg(null);
    try {
      const res = await fetch("/api/browser/screenshot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: report.url, fullPage, device }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 501) { setShotConfigured(false); setMsg(j.error || "Screenshots aren't enabled yet."); return; }
      if (res.status === 402) { setMsg("Out of credits for screenshots — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Capture failed."); return; }
      if (j.screenshot) setShots((prev) => [j.screenshot, ...prev]);
    } finally { setCapturing(false); }
  }

  async function inspect(target?: string) {
    const u = (target ?? url).trim();
    if (!u) { setMsg("Enter a URL to inspect."); return; }
    const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    setUrl(withProto); setLoading(true); setMsg(null); setAnswer("");
    try {
      const res = await fetch("/api/browser/inspect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: withProto }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(j.error || "Inspection failed."); return; }
      setReport(j.report);
      if (j.report?.error) setMsg(j.report.error);
      setTab("inspector");
      loadSide();
    } finally { setLoading(false); }
  }

  async function ask(action?: AssistantAction) {
    if (!report) { setMsg("Inspect a page first."); return; }
    setAsking(true); setAnswer("");
    try {
      const res = await fetch("/api/browser/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: contextFrom(report), action, question: action ? undefined : question }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setAnswer("You're out of credits for AI suggestions. Top up in the Credit Wallet."); return; }
      if (!res.ok) { setAnswer(j.error || "Could not get a suggestion."); return; }
      setAnswer(j.answer + (j.usedAI ? "" : "\n\n(Placeholder — set ANTHROPIC_API_KEY for page-specific AI.)"));
    } finally { setAsking(false); }
  }

  async function addBookmark() {
    if (!report) return;
    await fetch("/api/browser/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: report.url, title: report.meta.title }) });
    loadSide();
  }
  async function removeBookmark(id: string) { await fetch("/api/browser/bookmarks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); loadSide(); }

  const deviceWidth = DEVICE_PRESETS.find((d) => d.id === device)!.width;

  return (
    <div className="space-y-4">
      {/* Address bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && inspect()}
              placeholder="Enter a URL to inspect (e.g. yoursite.com/page)"
              className="h-10 w-full bg-transparent text-sm outline-none" aria-label="URL to inspect"
            />
          </div>
          <Button onClick={() => inspect()} disabled={loading}>{loading ? <Spinner className="h-4 w-4" /> : "Inspect"}</Button>
          {report?.ok && <Button variant="ghost" onClick={addBookmark} title="Bookmark"><Star className="h-4 w-4" /></Button>}
          {report?.ok && <Button variant="ghost" onClick={() => inspect(report.url)} title="Re-inspect"><RefreshCw className="h-4 w-4" /></Button>}
        </div>
        {/* Device toggle + hand-offs */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {DEVICE_PRESETS.map((d) => {
              const I = d.id === "desktop" ? Monitor : d.id === "tablet" ? Tablet : Smartphone;
              return <button key={d.id} onClick={() => setDevice(d.id)} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${device === d.id ? "bg-brand-100 text-brand-900 dark:bg-brand-950/50 dark:text-brand-300" : "text-muted-foreground hover:bg-muted"}`} title={d.label}><I className="h-3.5 w-3.5" />{d.label}</button>;
            })}
          </div>
          {report?.ok && (
            <div className="ml-auto flex flex-wrap gap-2 text-xs">
              <a href={`/dashboard/seo/audit?url=${encodeURIComponent(report.url)}`} className="rounded-md border border-border px-2 py-1 hover:bg-muted">Full SEO Audit →</a>
              <a href="/dashboard/seo/fixer" className="rounded-md border border-brand-400 px-2 py-1 text-brand-900 hover:bg-brand-50 dark:hover:bg-brand-950/20">Auto-fix on WordPress →</a>
              <a href="/dashboard/seo/sites" className="rounded-md border border-border px-2 py-1 hover:bg-muted">WordPress Sites →</a>
              <a href="/dashboard/build" className="rounded-md border border-border px-2 py-1 hover:bg-muted">Build Studio →</a>
            </div>
          )}
        </div>
      </Card>

      {msg && <Alert variant="warning">{msg}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Main: preview + tabs */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {(["inspector", "preview", "social"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-brand-500 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "social" ? "Snippet & Social" : t}
              </button>
            ))}
          </div>

          {!report && !loading && (
            <Card className="p-10 text-center text-muted-foreground">Enter a URL above and click <strong>Inspect</strong> to analyze any page.</Card>
          )}
          {loading && <Card className="flex items-center justify-center p-10"><Spinner className="h-6 w-6" /></Card>}

          {report?.ok && tab === "inspector" && <Inspector report={report} />}
          {report?.ok && tab === "preview" && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">Live preview @ {deviceWidth}px — some sites block embedding; use the Inspector if this is blank.</div>
              <div className="flex justify-center overflow-auto bg-muted/20 p-4">
                <iframe src={report.finalUrl} style={{ width: deviceWidth, height: 640, maxWidth: "100%" }} className="rounded border border-border bg-white" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Page preview" />
              </div>
            </Card>
          )}
          {report?.ok && tab === "social" && <SocialPreview report={report} />}
        </div>

        {/* Right: AI assistant + bookmarks/history */}
        <div className="space-y-4">
          <Card className="p-4">
            <button onClick={() => setAssistantOpen((v) => !v)} className="flex w-full items-center justify-between">
              <span className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-brand-600" /> AI Website Assistant</span>
              <span className="text-xs text-muted-foreground">{assistantOpen ? "Hide" : "Show"}</span>
            </button>
            {assistantOpen && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {ASSISTANT_ACTIONS.map((a) => (
                    <button key={a.id} disabled={!report?.ok || asking} onClick={() => ask(a.id)} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50">{a.label}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ask about this page…" disabled={!report?.ok} />
                  <Button onClick={() => ask()} disabled={!report?.ok || asking || !question.trim()}>Ask</Button>
                </div>
                {asking && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Thinking…</div>}
                {answer && <div className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{answer}</div>}
                <p className="text-[11px] text-muted-foreground">AI suggestions cost 2 credits each (free in placeholder mode).</p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-brand-600" /> Bookmarks</div>
            <ul className="mt-2 space-y-1 text-sm">
              {bookmarks.length === 0 && <li className="text-muted-foreground">None yet.</li>}
              {bookmarks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2">
                  <button onClick={() => inspect(b.url)} className="truncate text-left text-brand-600 hover:underline">{b.title || b.url}</button>
                  <button onClick={() => removeBookmark(b.id)} className="text-muted-foreground hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 font-semibold"><HistoryIcon className="h-4 w-4 text-brand-600" /> Recent</div>
            <ul className="mt-2 space-y-1 text-sm">
              {history.length === 0 && <li className="text-muted-foreground">No history yet.</li>}
              {history.slice(0, 12).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2">
                  <button onClick={() => inspect(h.url)} className="truncate text-left hover:underline">{h.title || h.url}</button>
                  {h.seo_score != null && <Badge variant={h.seo_score >= 80 ? "success" : h.seo_score >= 50 ? "warning" : "danger"}>{h.seo_score}</Badge>}
                </li>
              ))}
            </ul>
          </Card>

          {/* Screenshot Center */}
          <Card className="p-4">
            <div className="flex items-center gap-2 font-semibold"><Camera className="h-4 w-4 text-brand-600" /> Screenshot Center</div>
            {!shotConfigured ? (
              <p className="mt-2 text-sm text-muted-foreground">Add a <code>SCREENSHOT_API_KEY</code> in Vercel to enable full-page &amp; viewport capture.</p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => capture(true)} disabled={!report?.ok || capturing}>{capturing ? "Capturing…" : "Full page"}</Button>
                  <Button size="sm" variant="outline" onClick={() => capture(false)} disabled={!report?.ok || capturing}>Viewport</Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">3 credits per capture.</p>
              </>
            )}
            {shots.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {shots.slice(0, 6).map((s) => (
                  <a key={s.id} href={s.image_url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded border border-border" title={`${s.kind} · ${new URL(s.url).hostname}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image_url} alt={`Screenshot of ${s.url}`} className="h-20 w-full object-cover object-top transition group-hover:opacity-80" />
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );

  function contextFrom(r: InspectionReport): string {
    return [
      `URL: ${r.url}`, `Title: ${r.meta.title ?? "(none)"}`, `Meta description: ${r.meta.metaDescription ?? "(none)"}`,
      `H1: ${r.headings.h1.join(" | ") || "(none)"}`, `H2 count: ${r.headings.h2Count}, words: ${r.content.wordCount}`,
      `Images: ${r.images.imageCount} (${r.images.imagesMissingAlt} missing alt)`,
      `Links: ${r.links.internalLinks} internal / ${r.links.externalLinks} external`,
      `Schema: ${r.schema.schemaTypes.join(", ") || "none"}`, `SEO score: ${r.score}/100`,
      `Top issues: ${r.issues.filter((i) => i.severity !== "passed").slice(0, 8).map((i) => i.label).join("; ") || "none"}`,
    ].join("\n");
  }
}

function Inspector({ report }: { report: InspectionReport }) {
  const crit = report.issues.filter((i) => i.severity === "critical");
  const warn = report.issues.filter((i) => i.severity === "warning");
  const pass = report.issues.filter((i) => i.severity === "passed");
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <div className={`flex h-16 w-16 flex-col items-center justify-center rounded-full text-white ${report.score >= 80 ? "bg-green-600" : report.score >= 50 ? "bg-amber-500" : "bg-red-500"}`}>
          <span className="text-xl font-bold">{report.score}</span><span className="text-[9px]">/100</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{report.meta.title || "(no title)"}</p>
          <p className="truncate text-xs text-muted-foreground">{report.url} · {report.status} · {report.loadMs}ms</p>
          <div className="mt-1 flex gap-2 text-xs">
            <span className="text-red-600">{crit.length} critical</span>
            <span className="text-amber-600">{warn.length} warnings</span>
            <span className="text-green-600">{pass.length} passed</span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold">Issues &amp; checks</h3>
        <ul className="mt-3 space-y-2">
          {[...crit, ...warn, ...pass].map((i, n) => (
            <li key={n} className="flex items-start gap-2 text-sm">
              <Badge variant={SEV[i.severity]}>{i.severity}</Badge>
              <div><span className="font-medium">{i.label}</span>{i.detail && <span className="text-muted-foreground"> — {i.detail}</span>}</div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4 text-sm">
          <h3 className="font-semibold">Metadata</h3>
          <dl className="mt-2 space-y-1">
            <Row k="Title" v={`${report.meta.title ?? "—"} (${report.meta.titleLength})`} />
            <Row k="Description" v={`${report.meta.metaDescription ?? "—"} (${report.meta.metaDescriptionLength})`} />
            <Row k="Canonical" v={report.meta.canonical ?? "—"} />
            <Row k="Robots" v={report.meta.robotsMeta ?? "—"} />
            <Row k="Lang" v={report.meta.lang ?? "—"} />
            <Row k="Viewport" v={report.meta.viewport ? "yes" : "no"} />
          </dl>
        </Card>
        <Card className="p-4 text-sm">
          <h3 className="font-semibold">Structure</h3>
          <dl className="mt-2 space-y-1">
            <Row k="H1" v={report.headings.h1.join(" | ") || "—"} />
            <Row k="H2 / H3" v={`${report.headings.h2Count} / ${report.headings.h3Count}`} />
            <Row k="Images" v={`${report.images.imageCount} (${report.images.imagesMissingAlt} missing alt)`} />
            <Row k="Links" v={`${report.links.internalLinks} internal / ${report.links.externalLinks} external`} />
            <Row k="Schema" v={report.schema.schemaTypes.join(", ") || "none"} />
            <Row k="Words" v={String(report.content.wordCount)} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function SocialPreview({ report }: { report: InspectionReport }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Google search snippet</h3>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-green-700 dark:text-green-500">{report.snippet.url}</p>
          <p className="text-lg text-blue-700 hover:underline dark:text-blue-400">{report.snippet.title}</p>
          <p className="text-sm text-muted-foreground">{report.snippet.description}</p>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Open Graph / social card</h3>
        {report.og.title || report.og.image ? (
          <div className="overflow-hidden rounded-lg border border-border">
            {report.og.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={report.og.image} alt="OG image" className="aspect-[1.91/1] w-full object-cover" />
            )}
            <div className="p-3">
              <p className="text-xs uppercase text-muted-foreground">{report.og.siteName || new URL(report.url).hostname}</p>
              <p className="font-semibold">{report.og.title || report.meta.title || "(no og:title)"}</p>
              <p className="text-sm text-muted-foreground">{report.og.description || report.meta.metaDescription || "(no og:description)"}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No Open Graph tags found — social shares won&rsquo;t have a rich card. Ask the AI Assistant to generate them.</p>
        )}
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted-foreground">{k}</dt><dd className="min-w-0 flex-1 break-words">{v}</dd></div>;
}
