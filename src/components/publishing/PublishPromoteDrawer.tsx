"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Send, CalendarClock, Megaphone, Download, Workflow, Wand2, Check, AlertTriangle, ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { BrandIcon, hasBrandIcon } from "@/components/icons/BrandIcon";
import { ConnectAccountModal, type ConnectItem } from "@/components/integrations/ConnectAccountModal";
import { TikTokComposeSettings } from "@/components/publishing/TikTokComposeSettings";
import type { ContentTypeId } from "@/config/publishingCapabilities";
import type { TikTokPostOptions } from "@/lib/publishing/types";

type DestStatus = { id: string; label: string; brandIcon: string | null; accountType: string; live: boolean; connected: boolean; permissions: string };
type Summary = {
  contentType: string; label: string; studio: string;
  destinations: DestStatus[]; adPlatforms: DestStatus[];
  exportFormats: string[]; scheduleOptions: string[]; metadataFields: string[];
  automationActions: string[]; creditEstimate: Record<string, number | undefined>;
};
type WpSite = { id: string; site_name: string | null; site_url: string };

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  contentType: ContentTypeId;
  sourceKind?: string;
  sourceId?: string | null;
  assetUrl?: string | null;
  contentHtml?: string | null;
  downloadUrl?: string | null;
  baseMetadata?: { title?: string; description?: string; caption?: string; hashtags?: string[] };
  initialTab?: TabId;
};

type TabId = "publish" | "schedule" | "promote" | "export" | "automation";
const TABS: { id: TabId; label: string; icon: typeof Send }[] = [
  { id: "publish", label: "Publish", icon: Send },
  { id: "schedule", label: "Schedule", icon: CalendarClock },
  { id: "promote", label: "Promote", icon: Megaphone },
  { id: "export", label: "Export", icon: Download },
  { id: "automation", label: "Automation", icon: Workflow },
];

type PubResult = { destination: string; status: string; url?: string | null; error?: string | null; package?: Record<string, unknown> | null; live: boolean };

function DestIcon({ slug, className }: { slug: string | null; className?: string }) {
  if (slug && hasBrandIcon(slug)) return <BrandIcon platform={slug} className={className} />;
  return <Package className={className} />;
}

export function PublishPromoteDrawer(props: DrawerProps) {
  const { open, onClose, contentType, sourceKind, sourceId, assetUrl, contentHtml, downloadUrl, baseMetadata } = props;
  const [tab, setTab] = useState<TabId>(props.initialTab ?? "publish");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [adPicked, setAdPicked] = useState<Record<string, boolean>>({});
  const [meta, setMeta] = useState({ title: "", description: "", caption: "", hashtags: "" });
  const [wpSites, setWpSites] = useState<WpSite[]>([]);
  const [wpSiteId, setWpSiteId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [scheduleFor, setScheduleFor] = useState("");
  const [promo, setPromo] = useState({ objective: "traffic", budget: "", country: "", audience: "", landingUrl: "", cta: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<PubResult[]>([]);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [tiktokOpts, setTiktokOpts] = useState<TikTokPostOptions | null>(null);
  const [tiktokValid, setTiktokValid] = useState(false);
  const onTiktokChange = useCallback((options: TikTokPostOptions | null, valid: boolean) => {
    setTiktokOpts(options); setTiktokValid(valid);
  }, []);

  function reloadCaps() {
    fetch(`/api/publishing/capabilities?contentType=${contentType}`).then((r) => r.json()).then((j) => { if (j.summary) setSummary(j.summary); });
  }

  useEffect(() => { if (props.initialTab) setTab(props.initialTab); }, [props.initialTab, open]);

  useEffect(() => {
    if (!open) return;
    setMeta({ title: baseMetadata?.title ?? "", description: baseMetadata?.description ?? "", caption: baseMetadata?.caption ?? "", hashtags: (baseMetadata?.hashtags ?? []).join(" ") });
    setResults([]); setMsg(null);
    setLoading(true);
    fetch(`/api/publishing/capabilities?contentType=${contentType}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.summary) {
          setSummary(j.summary);
          setPicked(Object.fromEntries(j.summary.destinations.filter((d: DestStatus) => d.connected || d.live).map((d: DestStatus) => [d.id, false])));
        }
      })
      .finally(() => setLoading(false));
    fetch("/api/wordpress/sites").then((r) => r.json()).then((j) => setWpSites(j.sites ?? [])).catch(() => {});
  }, [open, contentType, baseMetadata]);

  const chosenDestinations = useCallback(() => Object.keys(picked).filter((k) => picked[k]), [picked]);
  const needsWp = chosenDestinations().some((d) => d === "wordpress" || d === "woocommerce");
  const needsWebhook = chosenDestinations().includes("custom_webhook");
  const needsTiktok = chosenDestinations().includes("tiktok");

  const buildReq = useCallback(() => ({
    contentType, sourceKind, sourceId,
    destinations: chosenDestinations(),
    metadata: { title: meta.title, description: meta.description, caption: meta.caption, hashtags: meta.hashtags.split(/\s+/).filter(Boolean) },
    assetUrl, contentHtml, wpSiteId: wpSiteId || null, webhookUrl: webhookUrl || null,
    tiktok: chosenDestinations().includes("tiktok") ? tiktokOpts : undefined,
  }), [contentType, sourceKind, sourceId, chosenDestinations, meta, assetUrl, contentHtml, wpSiteId, webhookUrl, tiktokOpts]);

  async function optimize() {
    const dests = chosenDestinations();
    if (dests.length === 0) { setMsg({ kind: "error", text: "Pick at least one destination to optimize for." }); return; }
    setBusy("optimize"); setMsg(null);
    try {
      const res = await fetch("/api/publishing/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentType, destinations: dests, base: { title: meta.title, description: meta.description, caption: meta.caption, hashtags: meta.hashtags.split(/\s+/).filter(Boolean) }, optimize: true }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg({ kind: "error", text: "Out of credits — top up in the Credit Wallet." }); return; }
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Optimization failed." }); return; }
      const first = j.results?.[0]?.meta;
      if (first) setMeta({ title: first.title || meta.title, description: first.description || meta.description, caption: first.caption || meta.caption, hashtags: (first.hashtags || []).join(" ") });
      setMsg({ kind: "success", text: `Optimized for ${j.results?.length ?? 0} platform(s) (${j.charged} credits). Showing the first — publish applies each platform's own copy.` });
    } finally { setBusy(null); }
  }

  async function doPublish(schedule: boolean) {
    const dests = chosenDestinations();
    if (dests.length === 0) { setMsg({ kind: "error", text: "Select at least one destination." }); return; }
    if (needsWp && !wpSiteId) { setMsg({ kind: "error", text: "Choose which WordPress site to publish to." }); return; }
    if (needsWebhook && !webhookUrl) { setMsg({ kind: "error", text: "Enter your webhook URL." }); return; }
    if (needsTiktok && !tiktokValid) { setMsg({ kind: "error", text: "Complete the TikTok post settings below (choose who can view the video)." }); return; }
    if (schedule && !scheduleFor) { setMsg({ kind: "error", text: "Pick a date and time." }); return; }
    setBusy(schedule ? "schedule" : "publish"); setMsg(null); setResults([]);
    try {
      const url = schedule ? "/api/publishing/schedule" : "/api/publishing/publish";
      const body = schedule ? { ...buildReq(), scheduleFor: new Date(scheduleFor).toISOString() } : buildReq();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Failed." }); return; }
      setResults(j.results ?? []);
      const ok = (j.results ?? []).filter((r: PubResult) => r.status === "published" || r.status === "scheduled").length;
      const pkg = (j.results ?? []).filter((r: PubResult) => r.status === "export_ready").length;
      const fail = (j.results ?? []).filter((r: PubResult) => r.status === "failed").length;
      setMsg({ kind: fail && !ok ? "error" : "success", text: `${ok ? `${ok} ${schedule ? "scheduled" : "published"}. ` : ""}${pkg ? `${pkg} export package(s) ready. ` : ""}${fail ? `${fail} failed.` : ""}`.trim() });
    } finally { setBusy(null); }
  }

  async function doPromote() {
    const platforms = Object.keys(adPicked).filter((k) => adPicked[k]);
    if (platforms.length === 0) { setMsg({ kind: "error", text: "Select at least one ad platform." }); return; }
    setBusy("promote"); setMsg(null); setResults([]);
    try {
      const res = await fetch("/api/promotion/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentType, sourceKind, sourceId, title: meta.title || summary?.label || "Promotion", objective: promo.objective, adPlatforms: platforms, budget: promo.budget ? Number(promo.budget) : undefined, country: promo.country || undefined, audience: promo.audience || undefined, landingUrl: promo.landingUrl || undefined, cta: promo.cta || undefined, generateCreative: true }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg({ kind: "error", text: "Out of credits — top up in the Credit Wallet." }); return; }
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Couldn't create campaign." }); return; }
      setResults((j.jobs ?? []).map((job: { ad_platform: string; status: string; export_package: Record<string, unknown> }) => ({ destination: job.ad_platform, status: job.status, package: job.export_package, live: false })));
      setMsg({ kind: "success", text: `Campaign package ready for ${j.jobs?.length ?? 0} platform(s) (${j.charged} credits). Copy the ad copy into each Ads Manager.` });
    } finally { setBusy(null); }
  }

  if (!open) return null;
  const creditNote = (k: string) => summary?.creditEstimate?.[k] ? ` (~${summary.creditEstimate[k]} cr)` : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Publish and promote">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{summary?.label ?? "Publish & Promote"}</h2>
            <p className="text-xs text-muted-foreground">Publish, schedule, promote, or export — without leaving this project.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
          {TABS.map((t) => {
            const TIcon = t.icon;
            const enabled = t.id !== "promote" || (summary?.adPlatforms.length ?? 0) > 0;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} disabled={!enabled}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 ${tab === t.id ? "bg-brand-100 text-brand-900 dark:bg-brand-950/50 dark:text-brand-300" : "text-muted-foreground hover:bg-muted"}`}>
                <TIcon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading || !summary ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading options…</div>
          ) : (
            <div className="space-y-4">
              {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.kind === "success" ? "border-l-4 border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>{msg.text}</div>}

              {/* metadata (shared by publish/schedule/promote) */}
              {(tab === "publish" || tab === "schedule" || tab === "promote") && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Title</label>
                  <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="Title / headline" />
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <textarea value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Description" />
                  {(tab === "publish" || tab === "schedule") && (
                    <>
                      <label className="text-xs font-semibold text-muted-foreground">Hashtags</label>
                      <Input value={meta.hashtags} onChange={(e) => setMeta({ ...meta, hashtags: e.target.value })} placeholder="#one #two #three" />
                      <Button variant="outline" size="sm" onClick={optimize} disabled={busy === "optimize"}>
                        {busy === "optimize" ? <Spinner className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />} Optimize per platform{creditNote("optimize")}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* PUBLISH / SCHEDULE destinations */}
              {(tab === "publish" || tab === "schedule") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">Destinations</p>
                    <button onClick={() => setConnectOpen(true)} className="text-xs font-medium text-brand-600 hover:underline">Connect an account</button>
                  </div>
                  {summary.destinations.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <input type="checkbox" checked={!!picked[d.id]} onChange={(e) => setPicked((p) => ({ ...p, [d.id]: e.target.checked }))} className="h-4 w-4" />
                      <DestIcon slug={d.brandIcon} className="h-4 w-4" />
                      <span className="flex-1 text-sm">{d.label}</span>
                      {d.live ? <Badge variant="success">live</Badge> : <Badge variant="warning">export</Badge>}
                      {d.connected ? <Badge variant="default"><Check className="h-3 w-3" /></Badge> : null}
                    </label>
                  ))}
                  {needsWp && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">WordPress site</label>
                      <select value={wpSiteId} onChange={(e) => setWpSiteId(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                        <option value="">Select a site…</option>
                        {wpSites.map((s) => <option key={s.id} value={s.id}>{s.site_name || s.site_url}</option>)}
                      </select>
                    </div>
                  )}
                  {needsWebhook && <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-site.com/webhook" />}
                  {needsTiktok && <TikTokComposeSettings onChange={onTiktokChange} />}
                  {tab === "schedule" && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Publish at</label>
                      <Input type="datetime-local" value={scheduleFor} onChange={(e) => setScheduleFor(e.target.value)} />
                    </div>
                  )}
                  <Button onClick={() => doPublish(tab === "schedule")} disabled={busy === "publish" || busy === "schedule" || (needsTiktok && !tiktokValid)}>
                    {busy ? <Spinner className="h-4 w-4" /> : tab === "schedule" ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {tab === "schedule" ? "Schedule" : "Publish now"}
                  </Button>
                </div>
              )}

              {/* PROMOTE */}
              {tab === "promote" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Ad platforms</p>
                  {summary.adPlatforms.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <input type="checkbox" checked={!!adPicked[d.id]} onChange={(e) => setAdPicked((p) => ({ ...p, [d.id]: e.target.checked }))} className="h-4 w-4" />
                      <DestIcon slug={d.brandIcon} className="h-4 w-4" />
                      <span className="flex-1 text-sm">{d.label}</span>
                      <Badge variant="warning">export pkg</Badge>
                    </label>
                  ))}
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={promo.budget} onChange={(e) => setPromo({ ...promo, budget: e.target.value })} placeholder="Budget" inputMode="numeric" />
                    <Input value={promo.country} onChange={(e) => setPromo({ ...promo, country: e.target.value })} placeholder="Country" />
                  </div>
                  <Input value={promo.audience} onChange={(e) => setPromo({ ...promo, audience: e.target.value })} placeholder="Target audience" />
                  <Input value={promo.landingUrl} onChange={(e) => setPromo({ ...promo, landingUrl: e.target.value })} placeholder="Landing page URL" />
                  <Button onClick={doPromote} disabled={busy === "promote"}>
                    {busy === "promote" ? <Spinner className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />} Generate ad campaign{creditNote("campaignPackage")}
                  </Button>
                </div>
              )}

              {/* EXPORT */}
              {tab === "export" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Download this project in any supported format.</p>
                  <div className="flex flex-wrap gap-2">
                    {summary.exportFormats.map((f) => (
                      <a key={f} href={downloadUrl ?? assetUrl ?? "#"} download className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm ${downloadUrl || assetUrl ? "hover:bg-muted" : "pointer-events-none opacity-50"}`}>
                        <Download className="h-3.5 w-3.5" /> {f.toUpperCase()}
                      </a>
                    ))}
                  </div>
                  {!(downloadUrl || assetUrl) && <p className="text-xs text-muted-foreground">Use your studio&rsquo;s export panel for format-specific downloads.</p>}
                </div>
              )}

              {/* AUTOMATION */}
              {tab === "automation" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Hand this project to your automated workflows.</p>
                  {summary.automationActions.map((a) => (
                    <div key={a} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="capitalize">{a.replace(/_/g, " ")}</span>
                      <Badge variant="default">Automation Studio</Badge>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Approval mode: <strong>Assisted</strong> — AI prepares, you approve. High-risk ad actions always confirm.</p>
                </div>
              )}

              {/* RESULTS */}
              {results.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">Results</p>
                  {results.map((r, i) => (
                    <div key={i} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 font-medium">{r.destination}</span>
                        {r.status === "published" && <Badge variant="success"><Check className="h-3 w-3" /> published</Badge>}
                        {r.status === "scheduled" && <Badge variant="info">scheduled</Badge>}
                        {r.status === "export_ready" && <Badge variant="warning">package ready</Badge>}
                        {r.status === "failed" && <Badge variant="danger"><AlertTriangle className="h-3 w-3" /> failed</Badge>}
                      </div>
                      {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">View <ExternalLink className="h-3 w-3" /></a>}
                      {r.error && <p className="mt-1 text-xs text-red-600">{r.error}</p>}
                      {r.package && <details className="mt-1"><summary className="cursor-pointer text-xs text-brand-600">View package</summary><pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-[11px]">{JSON.stringify(r.package, null, 2)}</pre></details>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConnectAccountModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title="Connect an account"
        items={[
          ...(summary?.destinations ?? []),
          ...(summary?.adPlatforms ?? []),
        ].filter((d) => !d.connected).map((d): ConnectItem => ({ id: d.id, label: d.label, brandIcon: d.brandIcon, accountType: d.accountType, live: d.live, connected: d.connected, permissions: d.permissions }))}
        onConnected={() => { setConnectOpen(false); reloadCaps(); }}
      />
    </div>
  );
}
