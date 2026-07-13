"use client";

import { useState } from "react";
import { Megaphone, Send, CalendarClock, Check, AlertTriangle, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { BrandIcon, hasBrandIcon } from "@/components/icons/BrandIcon";
import { SOCIAL_CONTENT_TYPES, socialContentTypeLabel, SOCIAL_CREDIT_COSTS, type SocialContentType } from "@/config/socialContentCapabilities";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/config/socialProviderCapabilities";

type Variation = { platform: string; caption: string; body: string; cta: string };
type Result = { platform: string; status: string; message?: string | null };
const CHOICES: SocialProviderId[] = ["facebook", "instagram", "linkedin", "tiktok", "youtube", "pinterest", "x"];
const GOALS = ["brand awareness", "website traffic", "lead generation", "sales", "engagement", "event promotion", "product launch", "recruitment", "community growth"];
function Icon({ slug }: { slug: string }) { return hasBrandIcon(slug) ? <BrandIcon platform={slug} className="h-4 w-4" /> : <span className="inline-block h-4 w-4 rounded bg-muted" />; }

export function CampaignWizard() {
  const [form, setForm] = useState({ name: "", goal: "brand awareness", contentType: "announcement" as SocialContentType, business: "", product: "", audience: "", tone: "professional", offer: "", cta: "", approvalMode: "assisted" });
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({ instagram: true, facebook: true, linkedin: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [sched, setSched] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const chosen = () => Object.keys(platforms).filter((k) => platforms[k]) as SocialProviderId[];

  async function build() {
    const pf = chosen();
    if (!form.name.trim()) { setMsg({ kind: "error", text: "Name your campaign." }); return; }
    if (pf.length === 0) { setMsg({ kind: "error", text: "Pick at least one platform." }); return; }
    setBusy("build"); setMsg(null); setVariations([]); setResults({});
    try {
      const res = await fetch("/api/social-business/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, platforms: pf }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg({ kind: "error", text: "Out of credits — top up in the Credit Wallet." }); return; }
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Campaign failed." }); return; }
      setProjectId(j.projectId); setVariations(j.variations ?? []);
      setMsg({ kind: "success", text: `Campaign package ready for ${pf.length} platform(s) (${j.charged} credits).` });
    } finally { setBusy(null); }
  }

  async function act(v: Variation, schedule: boolean) {
    setBusy(`${schedule ? "sched" : "pub"}-${v.platform}`);
    try {
      const url = schedule ? "/api/social-business/schedule" : "/api/social-business/publish";
      const dest = { platform: v.platform, scheduleFor: schedule ? new Date(sched[v.platform]).toISOString() : null };
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, destinations: [dest] }) });
      const j = await res.json().catch(() => ({}));
      const r = (j.results ?? [])[0];
      if (r) setResults((rs) => ({ ...rs, [v.platform]: r }));
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="cw-name" className="text-sm font-medium">Campaign name</label><Input id="cw-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Spring launch" /></div>
          <div><label htmlFor="cw-goal" className="text-sm font-medium">Goal</label><select id="cw-goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm capitalize">{GOALS.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
          <div><label htmlFor="cw-type" className="text-sm font-medium">Content type</label><select id="cw-type" value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value as SocialContentType })} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{SOCIAL_CONTENT_TYPES.map((t) => <option key={t} value={t}>{socialContentTypeLabel(t)}</option>)}</select></div>
          <div><label htmlFor="cw-mode" className="text-sm font-medium">Approval mode</label><select id="cw-mode" value={form.approvalMode} onChange={(e) => setForm({ ...form, approvalMode: e.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm capitalize"><option value="manual">Manual</option><option value="assisted">Assisted</option><option value="autopilot">Autopilot</option></select></div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} placeholder="Business" />
          <Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Product / service" />
          <Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Audience" />
          <Input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder="Offer (optional)" />
        </div>
        <p className="mt-3 text-sm font-medium">Platforms</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {CHOICES.map((p) => <button key={p} onClick={() => setPlatforms((s) => ({ ...s, [p]: !s[p] }))} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${platforms[p] ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20" : "border-border"}`}><Icon slug={p} /> {SOCIAL_PROVIDERS[p].name}</button>)}
        </div>
        <Button className="mt-3" onClick={build} disabled={busy === "build"}>{busy === "build" ? <><Spinner className="h-4 w-4" /> Building…</> : <><Megaphone className="h-4 w-4" /> Build campaign (~{SOCIAL_CREDIT_COSTS.campaign} cr)</>}</Button>
        {msg && <p className={`mt-2 rounded-lg px-3 py-2 text-sm ${msg.kind === "success" ? "bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>{msg.text}</p>}
      </Card>

      {variations.map((v) => {
        const r = results[v.platform];
        return (
          <Card key={v.platform} className="p-4">
            <div className="flex items-center gap-2"><Icon slug={v.platform} /><span className="text-sm font-semibold">{SOCIAL_PROVIDERS[v.platform as SocialProviderId]?.name ?? v.platform}</span>
              {r && <Badge className="ml-auto" variant={r.status === "scheduled" || r.status === "published" ? "success" : r.status === "failed" ? "danger" : "warning"}>{r.status === "unavailable" ? "not live yet" : r.status}</Badge>}
            </div>
            <p className="mt-2 text-sm">{v.caption}</p>
            {r?.message && <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">{r.status === "unavailable" && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />}{r.message}</p>}
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Input type="datetime-local" value={sched[v.platform] ?? ""} onChange={(e) => setSched((s) => ({ ...s, [v.platform]: e.target.value }))} className="max-w-[210px]" />
              <Button variant="secondary" size="sm" onClick={() => act(v, true)} disabled={!sched[v.platform] || busy === `sched-${v.platform}`}><CalendarClock className="h-3.5 w-3.5" /> Schedule</Button>
              <Button size="sm" onClick={() => act(v, false)} disabled={busy === `pub-${v.platform}`}><Send className="h-3.5 w-3.5" /> Publish</Button>
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(v.caption); setCopied(v.platform); setTimeout(() => setCopied(null), 1500); }}>{copied === v.platform ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />}</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
