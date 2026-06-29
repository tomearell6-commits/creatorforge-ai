"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Trash2 } from "lucide-react";

const RULE_TYPES = [
  { id: "generate_schedule", label: "Generate content on a schedule" },
  { id: "publish_schedule", label: "Publish on a schedule" },
  { id: "chain", label: "Chain (e.g. Reel after each rendered short)" },
  { id: "pause_low_credits", label: "Pause when credits are insufficient" },
  { id: "resume_on_credits", label: "Resume automatically after credits added" },
];

export function RulesManager() {
  const [rules, setRules] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState(RULE_TYPES[0].id);

  function load() { fetch("/api/autopilot/rules").then((r) => r.json()).then((d) => setRules(d.rules ?? [])); }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!name.trim()) return;
    await fetch("/api/autopilot/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, rule_type: type }) });
    setName(""); load();
  }
  async function toggle(r: any) { await fetch("/api/autopilot/rules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, enabled: !r.enabled }) }); load(); }
  async function remove(id: string) { await fetch(`/api/autopilot/rules?id=${id}`, { method: "DELETE" }); load(); }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardTitle className="text-base">Add a rule</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="One SEO article every Monday" /></div>
          <div className="sm:col-span-2"><Label>Type</Label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              {RULE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={add} disabled={!name.trim()}>Add rule</Button>
      </Card>

      {rules.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">No rules yet.</Card>
      ) : rules.map((r) => (
        <Card key={r.id} className="flex items-center justify-between gap-3">
          <div><p className="font-medium">{r.name}</p><p className="text-xs capitalize text-muted-foreground">{r.rule_type.replace(/_/g, " ")}</p></div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={r.enabled} onChange={() => toggle(r)} /> Enabled</label>
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
