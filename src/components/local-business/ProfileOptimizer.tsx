"use client";

import { useEffect, useState } from "react";
import { Wand2, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { LB_CREDIT_COSTS } from "@/config/localBusiness";

type Loc = { id: string; business_name: string };
type Rec = { section: string; current: string; recommended: string; reason: string; priority: string; impact: string };

const SECTIONS = [
  { id: "description", label: "Business Description" },
  { id: "services", label: "Service Descriptions" },
  { id: "products", label: "Product Descriptions" },
  { id: "appointment_cta", label: "Appointment CTA" },
];

export function ProfileOptimizer() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [locId, setLocId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [rec, setRec] = useState<Rec | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/local-business/locations").then((r) => r.json()).then((j) => { setLocs(j.locations ?? []); if (j.locations?.[0]) setLocId(j.locations[0].id); });
  }, []);

  async function optimize(section: string) {
    if (!locId) { setMsg("Select a location first."); return; }
    setBusy(section); setMsg(null); setRec(null);
    try {
      const res = await fetch("/api/local-business/optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: locId, section }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg("Out of credits — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Optimization failed."); return; }
      setRec(j);
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <label htmlFor="lb-opt-loc" className="text-sm font-medium">Business location</label>
        <select id="lb-opt-loc" value={locId} onChange={(e) => setLocId(e.target.value)} className="mt-1 block h-10 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm">
          {locs.length === 0 && <option value="">No locations yet</option>}
          {locs.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
        </select>
        <div className="mt-3 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <Button key={s.id} variant="outline" size="sm" onClick={() => optimize(s.id)} disabled={busy === s.id}>
              {busy === s.id ? <Spinner className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />} {s.label} (~{LB_CREDIT_COSTS.description_optimize} cr)
            </Button>
          ))}
        </div>
        {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {rec && (
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold capitalize">{rec.section.replace(/_/g, " ")}</h3>
            <Badge variant={rec.priority === "high" ? "danger" : "warning"}>{rec.priority} priority</Badge>
            <Badge variant="default">{rec.impact} impact</Badge>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div><p className="text-xs font-semibold text-muted-foreground">Current</p><p className="mt-1 rounded-lg bg-muted/50 p-2 text-sm">{rec.current || "(empty)"}</p></div>
            <div><p className="text-xs font-semibold text-brand-600">Recommended</p><p className="mt-1 rounded-lg border border-brand-500/30 bg-brand-50/50 p-2 text-sm dark:bg-brand-950/20">{rec.recommended}</p></div>
          </div>
          {rec.reason && <p className="mt-2 text-xs text-muted-foreground"><strong>Why:</strong> {rec.reason}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(rec.recommended); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />} Copy suggestion
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Apply manually in your Google Business Profile. Direct writes activate only once Business Profile API access is approved and you explicitly approve each change.</p>
        </Card>
      )}
    </div>
  );
}
