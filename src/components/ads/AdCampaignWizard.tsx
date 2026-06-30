"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { AD_OBJECTIVES, AD_CREATIVE_TYPES, AD_PLATFORMS, adPlatform } from "@/lib/constants";
import { AdCreativeStudio } from "./AdCreativeStudio";

const STEPS = ["Business", "Objective", "Platforms", "Creative", "Audience", "Review", "Create"];
function toggle(a: string[], v: string) { return a.includes(v) ? a.filter((x) => x !== v) : [...a, v]; }

export function AdCampaignWizard() {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<any[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState<any>({
    name: "", business: "", website: "", industry: "", country: "", language: "en",
    objective: "traffic", platforms: [] as string[], creative_types: [] as string[],
    audience: { country: "", age_min: 18, age_max: 65, gender: "all", interests: "" },
  });

  useEffect(() => { fetch("/api/ads/templates").then((r) => r.json()).then((d) => setTemplates(d.templates ?? [])); }, []);

  function applyTemplate(t: any) {
    setF((prev: any) => ({ ...prev, industry: t.name, objective: t.objective, creative_types: t.recommended_formats ?? [] }));
  }

  // Creative types allowed across the chosen platforms.
  const allowedFormats = new Set(f.platforms.flatMap((p: string) => adPlatform(p)?.formats ?? []));
  const formatOptions = AD_CREATIVE_TYPES.filter((c) => f.platforms.length === 0 || allowedFormats.has(c.id));

  async function create() {
    if (!f.name.trim()) { setStep(0); setErr("Campaign name is required."); return; }
    setBusy(true); setErr(null);
    const r = await fetch("/api/ads/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, audience: { ...f.audience, interests: String(f.audience.interests || "").split(",").map((s: string) => s.trim()).filter(Boolean) } }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(d.error || "Could not create campaign."); return; }
    setCreatedId(d.id);
  }

  if (createdId) {
    return (
      <div className="space-y-6">
        <Card className="border-brand-300 bg-brand-50/40">
          <h2 className="font-semibold text-ink dark:text-foreground">Campaign created ✓</h2>
          <p className="mt-1 text-sm text-muted-foreground">Now generate ad creatives for &ldquo;{f.name}&rdquo;. They&apos;ll be saved to this campaign.</p>
        </Card>
        <AdCreativeStudio campaignId={createdId} />
      </div>
    );
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => <span key={s} className={`rounded-full px-2.5 py-1 text-xs ${i === step ? "bg-brand-600 text-white" : i < step ? "bg-brand-100 text-brand-700" : "bg-muted text-muted-foreground"}`}>{i + 1}. {s}</span>)}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          {templates.length > 0 && (
            <div>
              <Label>Start from an industry template (optional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => <button key={t.slug} type="button" onClick={() => applyTemplate(t)} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted">{t.name}</button>)}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label htmlFor="adcw-campaign-name">Campaign name</Label><Input id="adcw-campaign-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Spring Sale 2026" /></div>
            <div><Label htmlFor="adcw-business">Business</Label><Input id="adcw-business" value={f.business} onChange={(e) => setF({ ...f, business: e.target.value })} /></div>
            <div><Label htmlFor="adcw-website">Website</Label><Input id="adcw-website" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://…" /></div>
            <div><Label htmlFor="adcw-industry">Industry</Label><Input id="adcw-industry" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} /></div>
            <div><Label htmlFor="adcw-country">Country</Label><Input id="adcw-country" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
            <div><Label htmlFor="adcw-language">Language</Label><Input id="adcw-language" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} /></div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div><Label>Objective</Label><div className="grid gap-2 sm:grid-cols-2">{AD_OBJECTIVES.map((o) => <button key={o.id} type="button" onClick={() => setF({ ...f, objective: o.id })} className={`rounded-lg border p-3 text-left text-sm ${f.objective === o.id ? "border-brand-500 bg-brand-50" : "border-border hover:bg-muted"}`}>{o.label}</button>)}</div></div>
      )}

      {step === 2 && (
        <div><Label>Advertising platforms</Label><div className="flex flex-wrap gap-2">{AD_PLATFORMS.map((p) => <button key={p.id} type="button" onClick={() => setF({ ...f, platforms: toggle(f.platforms, p.id) })} className={`rounded-full border px-3 py-1.5 text-sm ${f.platforms.includes(p.id) ? "border-brand-500 bg-brand-50 font-medium text-brand-800" : "border-border hover:bg-muted"}`}>{p.name}</button>)}</div></div>
      )}

      {step === 3 && (
        <div><Label>Creative types (supported by your platforms)</Label><div className="flex flex-wrap gap-2">{formatOptions.map((c) => <button key={c.id} type="button" onClick={() => setF({ ...f, creative_types: toggle(f.creative_types, c.id) })} className={`rounded-full border px-3 py-1.5 text-sm ${f.creative_types.includes(c.id) ? "border-brand-500 bg-brand-50 font-medium text-brand-800" : "border-border hover:bg-muted"}`}>{c.label}</button>)}</div></div>
      )}

      {step === 4 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="adcw-audience-country">Country</Label><Input id="adcw-audience-country" value={f.audience.country} onChange={(e) => setF({ ...f, audience: { ...f.audience, country: e.target.value } })} /></div>
          <div><Label htmlFor="adcw-audience-gender">Gender</Label><select id="adcw-audience-gender" value={f.audience.gender} onChange={(e) => setF({ ...f, audience: { ...f.audience, gender: e.target.value } })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="all">All</option><option value="female">Female</option><option value="male">Male</option></select></div>
          <div><Label htmlFor="adcw-audience-age-min">Age min</Label><Input id="adcw-audience-age-min" type="number" value={f.audience.age_min} onChange={(e) => setF({ ...f, audience: { ...f.audience, age_min: Number(e.target.value) } })} /></div>
          <div><Label htmlFor="adcw-audience-age-max">Age max</Label><Input id="adcw-audience-age-max" type="number" value={f.audience.age_max} onChange={(e) => setF({ ...f, audience: { ...f.audience, age_max: Number(e.target.value) } })} /></div>
          <div className="sm:col-span-2"><Label htmlFor="adcw-audience-interests">Interest keywords (comma-separated)</Label><Input id="adcw-audience-interests" value={f.audience.interests} onChange={(e) => setF({ ...f, audience: { ...f.audience, interests: e.target.value } })} placeholder="fitness, nutrition, wellness" /></div>
          <p className="sm:col-span-2 text-xs text-muted-foreground">Custom + lookalike audiences activate once a supported ad account is connected.</p>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-1 text-sm">
          <Row k="Name" v={f.name} /><Row k="Objective" v={AD_OBJECTIVES.find((o) => o.id === f.objective)?.label} />
          <Row k="Platforms" v={f.platforms.join(", ") || "—"} /><Row k="Creative types" v={f.creative_types.join(", ") || "—"} />
          <Row k="Audience" v={`${f.audience.country || "any"} · ${f.audience.age_min}-${f.audience.age_max} · ${f.audience.gender}`} />
          <p className="pt-2 text-xs text-muted-foreground">Next: create the campaign, then generate AI creatives. Creating is free; generation uses credits.</p>
        </div>
      )}

      {step === 6 && (
        <div className="text-sm text-muted-foreground">Ready to create &ldquo;{f.name || "your campaign"}&rdquo; as a draft. After creating, you&apos;ll generate ad copy and variations.</div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex items-center justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        {step < STEPS.length - 1
          ? <Button onClick={() => setStep(step + 1)}>Next</Button>
          : <Button variant="accent" onClick={create} disabled={busy}>{busy ? "Creating…" : "Create campaign"}</Button>}
      </div>
    </Card>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return <div className="flex justify-between gap-3 border-b border-border/40 py-1"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v || "—"}</span></div>;
}
