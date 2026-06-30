"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

type Config = { enabled: boolean; free_messages: number; cost_simple: number; cost_workflow: number; cost_advanced: number; low_credit_threshold: number };
type Stats = { conversations: number; userMessages: number; freeMessages: number; paidMessages: number; creditsSpent: number; feedbackUp: number; feedbackDown: number; topQuestions: { q: string; n: number }[] };

export function AdminAssistant() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [saved, setSaved] = useState(false);

  function load() { fetch("/api/admin/assistant/settings").then((r) => r.json()).then((d) => { setCfg(d.config); setStats(d.stats); }); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!cfg) return;
    setSaved(false);
    await fetch("/api/admin/assistant/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Conversations" value={stats.conversations} />
          <Stat label="User messages" value={stats.userMessages} />
          <Stat label="Free messages" value={stats.freeMessages} />
          <Stat label="Paid messages" value={stats.paidMessages} />
          <Stat label="Credits spent" value={stats.creditsSpent} />
          <Stat label="👍 Helpful" value={stats.feedbackUp} />
          <Stat label="👎 Not helpful" value={stats.feedbackDown} />
        </div>
      )}

      <section className="space-y-3">
        <CardTitle className="text-base">Assistant settings</CardTitle>
        <Card className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
            Enable Forge AI Assistant
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Free messages / month" value={cfg.free_messages} onChange={(v) => setCfg({ ...cfg, free_messages: v })} />
            <Field label="Cost — simple (cr)" value={cfg.cost_simple} onChange={(v) => setCfg({ ...cfg, cost_simple: v })} />
            <Field label="Cost — workflow (cr)" value={cfg.cost_workflow} onChange={(v) => setCfg({ ...cfg, cost_workflow: v })} />
            <Field label="Cost — advanced (cr)" value={cfg.cost_advanced} onChange={(v) => setCfg({ ...cfg, cost_advanced: v })} />
            <Field label="Low-credit warning threshold" value={cfg.low_credit_threshold} onChange={(v) => setCfg({ ...cfg, low_credit_threshold: v })} />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save}>Save settings</Button>
            {saved && <span className="text-sm text-brand-700">Saved ✓</span>}
          </div>
        </Card>
      </section>

      {stats && stats.topQuestions.length > 0 && (
        <section className="space-y-3">
          <CardTitle className="text-base">Top questions</CardTitle>
          <Card>
            <ol className="space-y-1 text-sm">
              {stats.topQuestions.map((q, i) => (
                <li key={i} className="flex justify-between gap-3"><span className="truncate">{i + 1}. {q.q}…</span><span className="text-muted-foreground">{q.n}</span></li>
              ))}
            </ol>
          </Card>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><div className="text-xl font-bold">{value.toLocaleString()}</div><div className="text-xs text-muted-foreground">{label}</div></Card>;
}
function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <div><Label>{label}</Label><Input type="number" aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))} /></div>;
}
