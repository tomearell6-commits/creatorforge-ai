"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AUTOMATION_TRIGGERS, AUTOMATION_ACTIONS } from "@/lib/constants";
import type { AutomationRule } from "@/lib/types";

export function AutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState(AUTOMATION_TRIGGERS[0].value);
  const [action, setAction] = useState(AUTOMATION_ACTIONS[0].value);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AutomationRule | null>(null);

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
    setRemoving(true); setMsg(null);
    try {
      const res = await fetch(`/api/automation/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg({ kind: "error", text: j.error || "Couldn't delete the rule. Please try again." });
        return;
      }
      setMsg({ kind: "success", text: "Rule deleted." });
      await load();
    } catch {
      setMsg({ kind: "error", text: "Network error while deleting. Please try again." });
    } finally {
      setRemoving(false);
      setConfirmDelete(null);
    }
  }

  const label = (arr: readonly { value: string; label: string }[], v: string) => arr.find((x) => x.value === v)?.label ?? v;

  return (
    <div className="space-y-6">
      {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
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
              <button onClick={() => toggle(r)} className="cursor-pointer">
                <Badge variant={r.enabled ? "success" : "danger"}>{r.enabled ? "Enabled" : "Disabled"}</Badge>
              </button>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setConfirmDelete(r)}>Delete</button>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete rule?"
        description={confirmDelete ? `Delete "${confirmDelete.name}"? This automation rule will stop running and can't be recovered.` : undefined}
        confirmLabel="Delete"
        loading={removing}
        onConfirm={() => { if (confirmDelete) remove(confirmDelete.id); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
