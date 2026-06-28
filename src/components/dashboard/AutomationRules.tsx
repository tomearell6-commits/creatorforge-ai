"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AUTOMATION_TRIGGERS, AUTOMATION_ACTIONS } from "@/lib/constants";
import type { AutomationRule } from "@/lib/types";

export function AutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState(AUTOMATION_TRIGGERS[0].value);
  const [action, setAction] = useState(AUTOMATION_ACTIONS[0].value);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/automation");
    const json = await res.json();
    setRules(json.rules ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    await fetch("/api/automation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, trigger, action }),
    });
    setName("");
    await load();
    setBusy(false);
  }

  async function toggle(r: AutomationRule) {
    await fetch(`/api/automation/${r.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !r.enabled }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/automation/${id}`, { method: "DELETE" });
    await load();
  }

  const label = (arr: readonly { value: string; label: string }[], v: string) => arr.find((x) => x.value === v)?.label ?? v;

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <h3 className="font-semibold">New rule</h3>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name (e.g. Auto-notify on render)" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Trigger</label>
            <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={trigger} onChange={(e) => setTrigger(e.target.value as typeof trigger)}>
              {AUTOMATION_TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Action</label>
            <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
              {AUTOMATION_ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <Button disabled={busy} onClick={create}>{busy ? "Saving…" : "Add rule"}</Button>
      </Card>

      <div className="space-y-2">
        {rules.length === 0 && <p className="text-sm text-muted-foreground">No automation rules yet.</p>}
        {rules.map((r) => (
          <Card key={r.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">
                {label(AUTOMATION_TRIGGERS, r.trigger)} → {label(AUTOMATION_ACTIONS, r.action)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggle(r)}
                className={`rounded-full px-2 py-0.5 text-xs ${r.enabled ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                {r.enabled ? "Enabled" : "Disabled"}
              </button>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => remove(r.id)}>Delete</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
