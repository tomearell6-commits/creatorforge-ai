"use client";

import { useEffect, useState, useCallback } from "react";
import { Workflow, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Rule = { id: string; name: string; mode: string; rule_type: string | null; enabled: boolean };
const MODES = [
  { id: "manual", label: "Manual", desc: "AI prepares content; you publish everything yourself." },
  { id: "assisted", label: "Assisted (default)", desc: "AI prepares and schedules; you approve before publishing." },
  { id: "autopilot", label: "Autopilot", desc: "AI publishes per your approved rules. Opt-in; high-risk actions still confirm." },
];
const RULE_TYPES = [
  { id: "weekly_business_update", label: "Publish a business update every week" },
  { id: "friday_product_spotlight", label: "Publish a product spotlight every Friday" },
  { id: "seasonal_pre_event", label: "Seasonal post 7 days before an event" },
];

export function AutomationSettings() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [mode, setMode] = useState("assisted");
  const [ruleType, setRuleType] = useState(RULE_TYPES[0].id);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/local-business/automation").then((r) => r.json()).then((j) => setRules(j.rules ?? [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addRule() {
    setBusy(true);
    try {
      const label = RULE_TYPES.find((r) => r.id === ruleType)?.label ?? "Rule";
      await fetch("/api/local-business/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label, mode, ruleType, enabled: mode === "autopilot" ? true : false }) });
      load();
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2"><Workflow className="h-5 w-5 text-brand-600" /><h2 className="text-sm font-semibold">Automation</h2></div>
      <p className="mt-1 text-xs text-muted-foreground">Default mode is <strong>Assisted</strong>. Autopilot requires explicit opt-in and pauses if credits run out or the connection expires.</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} className={`rounded-lg border p-3 text-left text-xs ${mode === m.id ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20" : "border-border"}`}>
            <p className="font-semibold">{m.label}</p><p className="mt-0.5 text-muted-foreground">{m.desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm">
          {RULE_TYPES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <Button onClick={addRule} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : "Add rule"}</Button>
      </div>

      {loading ? <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>
        : rules.length > 0 && (
          <div className="mt-3 space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="flex-1">{r.name}</span>
                <Badge variant="default" className="capitalize">{r.mode}</Badge>
                {r.enabled ? <Badge variant="success"><Check className="h-3 w-3" /> on</Badge> : <Badge variant="default">off</Badge>}
              </div>
            ))}
          </div>
        )}
    </Card>
  );
}
