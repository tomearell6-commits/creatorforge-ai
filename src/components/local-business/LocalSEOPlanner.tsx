"use client";

import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { LB_CREDIT_COSTS } from "@/config/localBusiness";

type Loc = { id: string; business_name: string };
type Plan = Record<string, string[]>;

const SECTION_LABELS: Record<string, string> = {
  weeklyIdeas: "Weekly post ideas", monthlyCalendar: "Monthly calendar", serviceTopics: "Service topics",
  seasonalCampaigns: "Seasonal campaigns", faqIdeas: "FAQ ideas", blogIdeas: "Blog ideas", landingIdeas: "Landing page ideas",
};

export function LocalSEOPlanner() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [locId, setLocId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { fetch("/api/local-business/locations").then((r) => r.json()).then((j) => { setLocs(j.locations ?? []); if (j.locations?.[0]) setLocId(j.locations[0].id); }); }, []);

  async function run(planType: "monthly" | "full") {
    if (!locId) { setMsg("Select a location."); return; }
    setBusy(planType); setMsg(null); setPlan(null);
    try {
      const res = await fetch("/api/local-business/local-seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: locId, planType }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg("Out of credits — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Plan failed."); return; }
      setPlan(j.plan); setMsg(`Plan ready (${j.charged} credits).`);
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <label htmlFor="lb-seo-loc" className="text-sm font-medium">Location</label>
        <select id="lb-seo-loc" value={locId} onChange={(e) => setLocId(e.target.value)} className="mt-1 block h-10 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm">
          {locs.length === 0 && <option value="">No locations</option>}
          {locs.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
        </select>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => run("monthly")} disabled={busy === "monthly"}>{busy === "monthly" ? <Spinner className="h-4 w-4" /> : <CalendarRange className="h-4 w-4" />} Monthly plan (~{LB_CREDIT_COSTS.monthly_content_plan} cr)</Button>
          <Button onClick={() => run("full")} disabled={busy === "full"}>{busy === "full" ? <Spinner className="h-4 w-4" /> : <CalendarRange className="h-4 w-4" />} Full local SEO plan (~{LB_CREDIT_COSTS.full_local_seo_plan} cr)</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Practical local content ideas — no keyword stuffing or misleading location claims.</p>
        {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {plan && (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(plan).filter(([, v]) => Array.isArray(v) && v.length).map(([k, v]) => (
            <Card key={k} className="p-5">
              <h3 className="text-sm font-semibold">{SECTION_LABELS[k] ?? k}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">{v.map((s, i) => <Badge key={i} variant="default">{s}</Badge>)}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
