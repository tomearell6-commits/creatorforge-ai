"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { AD_OBJECTIVES, AD_PLATFORMS, AD_CREDIT_COSTS } from "@/lib/constants";
import { Coins, Sparkles } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

type Pack = {
  headlines: string[]; primaryTexts: string[]; descriptions: string[]; ctas: string[];
  hooks: string[]; benefits: string[]; hashtags: string[]; imagePrompts: string[]; videoPrompts: string[];
  variations: { label: string; headline: string; primaryText: string; cta: string }[];
};

export function AdCreativeStudio({ campaignId }: { campaignId?: string }) {
  const [product, setProduct] = useState("");
  const [objective, setObjective] = useState("traffic");
  const [platform, setPlatform] = useState("facebook");
  const [audience, setAudience] = useState("");
  const [pack, setPack] = useState<Pack | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    if (!product.trim()) { setMsg("Describe the product or offer."); return; }
    setBusy(true); setMsg(null);
    const r = await fetch("/api/ads/creatives/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, objective, platform, audience, campaignId }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMsg(d.error || "Generation failed."); return; }
    setPack(d.pack);
    setMsg(d.usedAI ? `Generated (${d.creditCost} credits).` : "Generated (placeholder — set ANTHROPIC_API_KEY for full AI).");
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div><Label htmlFor="acs-product-offer-to-advertise">Product / offer to advertise</Label><Textarea id="acs-product-offer-to-advertise" rows={2} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. eco-friendly dog food subscription — 30% off first box" /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label htmlFor="acs-objective">Objective</Label><select id="acs-objective" value={objective} onChange={(e) => setObjective(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{AD_OBJECTIVES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
          <div><Label htmlFor="acs-platform">Platform</Label><select id="acs-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{AD_PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><Label htmlFor="acs-audience-optional">Audience (optional)</Label><Input id="acs-audience-optional" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="dog owners, 25-45" /></div>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Coins className="h-4 w-4" /> ~{AD_CREDIT_COSTS.copy} credits</span>
          <Button onClick={go} disabled={busy}>{busy ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />} Generate ad copy</Button>
        </div>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {pack && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Block title="Headlines" items={pack.headlines} />
          <Block title="Primary text" items={pack.primaryTexts} />
          <Block title="Descriptions" items={pack.descriptions} />
          <Block title="Calls to action" items={pack.ctas} />
          <Block title="Hooks" items={pack.hooks} />
          <Block title="Benefit bullets" items={pack.benefits} />
          <Block title="Hashtags" items={[pack.hashtags.join(" ")]} />
          <Block title="Image prompts" items={pack.imagePrompts} />
          <Block title="Video prompts" items={pack.videoPrompts} />
          <Card>
            <CardTitle className="text-base">A/B variations</CardTitle>
            <div className="mt-2 space-y-2">
              {pack.variations.map((v) => (
                <div key={v.label} className="rounded-lg bg-muted/40 p-2 text-sm">
                  <span className="font-semibold">Variant {v.label}:</span> {v.headline}
                  <p className="text-muted-foreground">{v.primaryText} · <span className="font-medium">{v.cta}</span></p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  function copy(t: string) { navigator.clipboard.writeText(t); }
  return (
    <Card>
      <CardTitle className="text-base">{title}</CardTitle>
      <ul className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start justify-between gap-2 text-sm">
            <span>{it}</span>
            <button onClick={() => copy(it)} className="shrink-0 text-xs text-brand-700 hover:underline">Copy</button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
