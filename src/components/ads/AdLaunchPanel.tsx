"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Rocket, ExternalLink, Copy, Check, AlertTriangle, Megaphone } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type Campaign = { id: string; name: string; objective: string; platforms: string[]; status: string };
type PlatformInfo = { id: string; name: string; configured: boolean; account: { account_name: string | null } | null };
type LaunchPkg = {
  platform: string; platformName: string; status: "published" | "export_ready";
  configured: boolean; connected: boolean; managerUrl: string | null; docsUrl: string | null;
  package: Record<string, unknown>;
};

export function AdLaunchPanel({ initialCampaignId }: { initialCampaignId?: string } = {}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [amount, setAmount] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LaunchPkg[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ads/campaigns").then((r) => r.json()).then((d) => {
      setCampaigns(d.campaigns ?? []);
      if (!initialCampaignId && d.campaigns?.[0]) setCampaignId(d.campaigns[0].id);
    }).catch(() => {});
    fetch("/api/ads/accounts").then((r) => r.json()).then((d) => setPlatforms(d.platforms ?? [])).catch(() => {});
  }, [initialCampaignId]);

  const campaign = useMemo(() => campaigns.find((c) => c.id === campaignId), [campaigns, campaignId]);
  // Default the platform selection to the campaign's own platforms.
  useEffect(() => { setSelected(campaign?.platforms ?? []); setResult(null); }, [campaignId, campaign?.platforms]);

  const infoFor = (id: string) => platforms.find((p) => p.id === id);

  async function launch() {
    if (!campaignId || selected.length === 0) { setError("Pick a campaign and at least one platform."); return; }
    if (!authorized) { setError("Please confirm you authorize the ad spend."); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/ads/launch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId, platforms: selected, authorized,
          budget: { type: budgetType, amount: amount ? Number(amount) : undefined, currency: "USD" },
          schedule: { start: start || null, end: end || null },
        }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error || "Couldn't prepare the launch."); return; }
      setResult(j.packages ?? []);
    } finally { setBusy(false); }
  }

  function briefText(pkg: LaunchPkg): string {
    const p = pkg.package as Record<string, unknown>;
    const b = p.budget as { type?: string; amount?: number; currency?: string };
    const s = p.schedule as { start?: string; end?: string };
    const creatives = (p.creatives as Array<Record<string, string>>) ?? [];
    return [
      `Campaign: ${p.campaign}`,
      `Platform: ${pkg.platformName}`,
      `Objective: ${p.objective}`,
      `Budget: ${b?.amount ? `${b.currency} ${b.amount} / ${b.type}` : "(set in Ads Manager)"}`,
      s?.start ? `Schedule: ${s.start}${s.end ? ` → ${s.end}` : ""}` : "",
      "",
      ...creatives.flatMap((c, i) => [
        `— Ad ${c.variant ?? i + 1} —`,
        c.headline ? `Headline: ${c.headline}` : "",
        c.primaryText ? `Primary text: ${c.primaryText}` : "",
        c.description ? `Description: ${c.description}` : "",
        c.cta ? `CTA: ${c.cta}` : "",
        c.imageUrl ? `Image: ${c.imageUrl}` : "",
        c.videoUrl ? `Video: ${c.videoUrl}` : "",
        "",
      ]),
    ].filter(Boolean).join("\n");
  }

  async function copyBrief(pkg: LaunchPkg) {
    try { await navigator.clipboard.writeText(briefText(pkg)); setCopied(pkg.platform); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  }

  return (
    <Card className="space-y-5">
      <div>
        <CardTitle>Launch &amp; Export</CardTitle>
        <CardDescription>Review your campaign, set the budget, and launch — or export a ready-to-paste brief into each platform&rsquo;s Ads Manager.</CardDescription>
      </div>

      {campaigns.length === 0 ? (
        <Alert variant="info">No campaigns yet. Create one first, then come back to launch it.</Alert>
      ) : (
        <>
          <div>
            <Label htmlFor="launch-campaign">Campaign</Label>
            <select id="launch-campaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Platforms + connection readiness */}
          <div>
            <Label>Platforms</Label>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {(campaign?.platforms ?? []).length === 0 && <p className="text-xs text-muted-foreground">This campaign has no platforms selected — edit it to add some.</p>}
              {(campaign?.platforms ?? []).map((id) => {
                const info = infoFor(id);
                const on = selected.includes(id);
                return (
                  <button key={id} type="button" onClick={() => setSelected((s) => on ? s.filter((x) => x !== id) : [...s, id])}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm ${on ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "border-border"}`}>
                    <span className="flex items-center gap-2">
                      {on ? <Check className="h-4 w-4 text-brand-600" /> : <span className="h-4 w-4 rounded border border-border" />}
                      {info?.name ?? id}
                    </span>
                    {info?.account
                      ? <Badge variant="success">Connected</Badge>
                      : <Badge variant="default">Export</Badge>}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Not connected yet? <Link href="/dashboard/ads/accounts" className="text-brand-600 hover:underline">Connect ad accounts</Link>. You can still export a launch brief for any platform now.
            </p>
          </div>

          {/* Budget + schedule */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="launch-budget-type">Budget type</Label>
              <select id="launch-budget-type" value={budgetType} onChange={(e) => setBudgetType(e.target.value as "daily" | "lifetime")}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                <option value="daily">Daily</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div>
              <Label htmlFor="launch-amount">Budget (USD)</Label>
              <Input id="launch-amount" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="20" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label htmlFor="launch-start">Start</Label><Input id="launch-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><Label htmlFor="launch-end">End</Label><Input id="launch-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
          </div>

          {/* Spend authorization */}
          <label className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
            <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="mt-0.5" />
            <span className="text-amber-800 dark:text-amber-200">
              I&rsquo;ve reviewed the targeting, creative, and budget, and I authorize this ad spend. Ads run on my own connected ad account &mdash; CreatorsForge never charges my ad budget.
            </span>
          </label>

          {error && <Alert variant="error" title="Launch">{error}</Alert>}

          <Button onClick={launch} disabled={busy} variant="accent">
            {busy ? <><Spinner size="sm" /> Preparing…</> : <><Rocket className="h-4 w-4" /> Launch / Export</>}
          </Button>
        </>
      )}

      {/* Results: per-platform launch packages */}
      {result && (
        <div className="space-y-3">
          <Alert variant="info">
            <span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Automatic ad publishing activates per platform once its Ads API is approved and your ad account is connected. For now, open each Ads Manager and paste the ready-made brief below.</span>
          </Alert>
          {result.map((pkg) => (
            <Card key={pkg.platform} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-brand-600" />
                  <span className="font-semibold">{pkg.platformName}</span>
                  {pkg.connected ? <Badge variant="success">Connected</Badge> : <Badge variant="default">Export</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyBrief(pkg)}>
                    {copied === pkg.platform ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy brief
                  </Button>
                  {pkg.managerUrl && (
                    <Button asChild size="sm">
                      <a href={pkg.managerUrl} target="_blank" rel="noopener noreferrer">Open Ads Manager <ExternalLink className="h-3.5 w-3.5" /></a>
                    </Button>
                  )}
                </div>
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs text-muted-foreground">{briefText(pkg)}</pre>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
