"use client";

import { useState } from "react";
import { Gauge, Wand2, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/config/socialProviderCapabilities";
import { SOCIAL_CREDIT_COSTS } from "@/config/socialContentCapabilities";

const PROVIDERS: SocialProviderId[] = ["facebook", "instagram", "linkedin", "tiktok", "youtube", "pinterest", "x"];

export function SocialProfileOptimizer() {
  const [provider, setProvider] = useState<SocialProviderId>("instagram");
  const [cur, setCur] = useState({ bio: "", about: "", description: "", website: "", category: "", cta: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ healthScore: number; missing: string[]; suggestions: { bio: string; description: string; cta: string; recommendations: string[]; brandNotes: string } } | null>(null);
  const [copied, setCopied] = useState(false);

  async function optimize() {
    setBusy(true); setMsg(null); setResult(null);
    try {
      const res = await fetch("/api/social-business/profile/optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, current: cur }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg("Out of credits — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Failed."); return; }
      setResult(j);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <label htmlFor="sp-provider" className="text-sm font-medium">Platform</label>
        <select id="sp-provider" value={provider} onChange={(e) => setProvider(e.target.value as SocialProviderId)} className="mt-1 block h-10 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm">
          {PROVIDERS.map((p) => <option key={p} value={p}>{SOCIAL_PROVIDERS[p].name}</option>)}
        </select>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input value={cur.bio} onChange={(e) => setCur({ ...cur, bio: e.target.value })} placeholder="Bio" />
          <Input value={cur.category} onChange={(e) => setCur({ ...cur, category: e.target.value })} placeholder="Category" />
          <Input value={cur.website} onChange={(e) => setCur({ ...cur, website: e.target.value })} placeholder="Website" />
          <Input value={cur.cta} onChange={(e) => setCur({ ...cur, cta: e.target.value })} placeholder="Call to action" />
        </div>
        <textarea value={cur.description} onChange={(e) => setCur({ ...cur, description: e.target.value })} rows={2} className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm" placeholder="Business description / About" />
        <Button className="mt-3" onClick={optimize} disabled={busy}>{busy ? <><Spinner className="h-4 w-4" /> Analyzing…</> : <><Gauge className="h-4 w-4" /> Optimize profile (~{SOCIAL_CREDIT_COSTS.profile_optimize} cr)</>}</Button>
        <p className="mt-1 text-xs text-muted-foreground">Profile Health score — not a growth or ranking guarantee.</p>
        {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {result && (
        <>
          <Card className="p-5">
            <div className="flex items-center gap-3"><div className="text-3xl font-bold">{result.healthScore}</div><div className="text-xs text-muted-foreground">/ 100<br />Profile Health</div>
              {result.missing.length > 0 && <div className="ml-auto flex flex-wrap gap-1">{result.missing.map((m) => <Badge key={m} variant="warning">missing: {m}</Badge>)}</div>}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Wand2 className="h-4 w-4 text-brand-600" /> Suggestions</h3>
            {result.suggestions.bio && <div className="mt-2"><p className="text-xs font-semibold text-muted-foreground">Bio</p><p className="rounded-lg border border-brand-500/30 bg-brand-50/50 p-2 text-sm dark:bg-brand-950/20">{result.suggestions.bio}</p></div>}
            {result.suggestions.description && <div className="mt-2"><p className="text-xs font-semibold text-muted-foreground">Description</p><p className="rounded-lg border border-brand-500/30 bg-brand-50/50 p-2 text-sm dark:bg-brand-950/20">{result.suggestions.description}</p></div>}
            <p className="mt-2 text-sm"><strong>CTA:</strong> {result.suggestions.cta}</p>
            {result.suggestions.recommendations?.length > 0 && <ul className="mt-2 ml-4 list-disc space-y-0.5 text-sm">{result.suggestions.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>}
            <p className="mt-2 text-xs text-muted-foreground"><strong>Brand consistency:</strong> {result.suggestions.brandNotes}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { navigator.clipboard.writeText([result.suggestions.bio, result.suggestions.description].filter(Boolean).join("\n\n")); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />} Copy suggestions</Button>
          </Card>
        </>
      )}
    </div>
  );
}
