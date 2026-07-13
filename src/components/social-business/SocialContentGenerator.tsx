"use client";

import { useEffect, useState } from "react";
import { Wand2, Image as ImageIcon, Copy, Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { BrandIcon, hasBrandIcon } from "@/components/icons/BrandIcon";
import { SOCIAL_CONTENT_TYPES, socialContentTypeLabel, SOCIAL_CREDIT_COSTS, type SocialContentType } from "@/config/socialContentCapabilities";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/config/socialProviderCapabilities";

type Variation = { id?: string; platform: string; headline: string; caption: string; body: string; cta: string; hashtags?: string[]; hashtags_json?: string[]; image_prompt?: string; imagePrompt?: string; suggested_time?: string; suggestedTime?: string; compliance_notes?: string; complianceNotes?: string; image_url?: string };

const PLATFORM_CHOICES: SocialProviderId[] = ["facebook", "instagram", "linkedin", "tiktok", "youtube", "pinterest", "x", "threads"];

function Icon({ slug }: { slug: string }) { return hasBrandIcon(slug) ? <BrandIcon platform={slug} className="h-4 w-4" /> : <span className="inline-block h-4 w-4 rounded bg-muted" />; }

export function SocialContentGenerator() {
  const [form, setForm] = useState({ name: "", contentType: "announcement" as SocialContentType, business: "", product: "", goal: "traffic", audience: "", tone: "professional", offer: "", cta: "" });
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({ instagram: true, facebook: true, linkedin: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const chosen = () => Object.keys(platforms).filter((k) => platforms[k]) as SocialProviderId[];
  const cost = SOCIAL_CREDIT_COSTS.content_base + SOCIAL_CREDIT_COSTS.per_variation * chosen().length;

  async function generate() {
    const pf = chosen();
    if (pf.length === 0) { setMsg({ kind: "error", text: "Pick at least one platform." }); return; }
    setBusy("generate"); setMsg(null); setVariations([]); setProjectId(null);
    try {
      const res = await fetch("/api/social-business/content/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, platforms: pf }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg({ kind: "error", text: "Out of credits — top up in the Credit Wallet." }); return; }
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Generation failed." }); return; }
      setProjectId(j.projectId);
      const list = await fetch(`/api/social-business/content/variations?projectId=${j.projectId}`).then((r) => r.json());
      setVariations(list.variations ?? []);
      setMsg({ kind: "success", text: `${pf.length} platform version(s) ready (${j.charged} credits).` });
    } finally { setBusy(null); }
  }

  async function genImage(v: Variation) {
    if (!v.id) return;
    setBusy(`img-${v.id}`);
    try {
      const prompt = v.image_prompt || v.imagePrompt || `Original branded ${v.platform} graphic`;
      const res = await fetch("/api/social-business/images/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, variationId: v.id, projectId }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setVariations((vs) => vs.map((x) => x.id === v.id ? { ...x, image_url: j.url } : x));
      else setMsg({ kind: "error", text: j.error || "Image failed." });
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="sc-name" className="text-sm font-medium">Campaign name</label><Input id="sc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Spring launch" /></div>
          <div><label htmlFor="sc-type" className="text-sm font-medium">Content type</label>
            <select id="sc-type" value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value as SocialContentType })} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              {SOCIAL_CONTENT_TYPES.map((t) => <option key={t} value={t}>{socialContentTypeLabel(t)}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} placeholder="Business name" />
          <Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Product / service" />
          <Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Audience" />
          <Input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder="Offer (optional)" />
        </div>
        <p className="mt-3 text-sm font-medium">Platforms</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {PLATFORM_CHOICES.map((p) => (
            <button key={p} onClick={() => setPlatforms((s) => ({ ...s, [p]: !s[p] }))} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${platforms[p] ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20" : "border-border"}`}>
              <Icon slug={p} /> {SOCIAL_PROVIDERS[p].name}
            </button>
          ))}
        </div>
        <Button className="mt-3" onClick={generate} disabled={busy === "generate"}>{busy === "generate" ? <><Spinner className="h-4 w-4" /> Generating…</> : <><Wand2 className="h-4 w-4" /> Generate platform versions (~{cost} cr)</>}</Button>
        <p className="mt-1 text-xs text-muted-foreground">Each platform gets its own copy — never identical text.</p>
        {msg && <p className={`mt-2 rounded-lg px-3 py-2 text-sm ${msg.kind === "success" ? "bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>{msg.text}</p>}
      </Card>

      {variations.map((v) => {
        const compliance = v.compliance_notes || v.complianceNotes;
        const time = v.suggested_time || v.suggestedTime;
        const tags = v.hashtags_json || v.hashtags || [];
        return (
          <Card key={v.id || v.platform} className="p-4">
            <div className="flex items-center gap-2"><Icon slug={v.platform} /><span className="text-sm font-semibold">{SOCIAL_PROVIDERS[v.platform as SocialProviderId]?.name ?? v.platform}</span>{time && <span className="ml-auto text-xs text-muted-foreground">{time}</span>}</div>
            {compliance && <div className="mt-2 flex gap-2 rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />{compliance}</div>}
            <textarea value={v.caption} onChange={(e) => setVariations((vs) => vs.map((x) => x === v ? { ...x, caption: e.target.value } : x))} rows={3} className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm" />
            {tags.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{tags.map((t, i) => <Badge key={i} variant="default">{t}</Badge>)}</div>}
            {v.image_url && <img src={v.image_url} alt="" className="mt-2 max-h-56 rounded-lg border border-border" />}
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => genImage(v)} disabled={busy === `img-${v.id}`}>{busy === `img-${v.id}` ? <Spinner className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />} {v.image_url ? "Regenerate image" : "Add image (~5 cr)"}</Button>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(v.caption); setCopied(v.id || v.platform); setTimeout(() => setCopied(null), 1500); }}>{copied === (v.id || v.platform) ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />} Copy</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
