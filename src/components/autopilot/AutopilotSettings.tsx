"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function AutopilotSettings() {
  const [s, setS] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetch("/api/autopilot/settings").then((r) => r.json()).then((d) => setS(d.settings)); }, []);
  if (!s) return <p className="text-sm text-muted-foreground">Loading…</p>;

  async function save() {
    setSaved(false);
    await fetch("/api/autopilot/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="aps-default-approval-mode">Default approval mode</Label>
          <select id="aps-default-approval-mode" value={s.default_mode} onChange={(e) => setS({ ...s, default_mode: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
            <option value="manual">Manual</option><option value="assisted">Assisted</option><option value="full">Full Autopilot</option>
          </select>
        </div>
        <div><Label htmlFor="aps-retry-limit">Retry limit (failed jobs)</Label><Input id="aps-retry-limit" type="number" value={s.retry_limit} onChange={(e) => setS({ ...s, retry_limit: Number(e.target.value) })} /></div>
        <div><Label htmlFor="aps-low-credit-threshold">Low-credit threshold</Label><Input id="aps-low-credit-threshold" type="number" value={s.low_credit_threshold} onChange={(e) => setS({ ...s, low_credit_threshold: Number(e.target.value) })} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.pause_on_low_credits} onChange={(e) => setS({ ...s, pause_on_low_credits: e.target.checked })} /> Pause automation when credits are insufficient (resume after topping up)</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.email_reports} onChange={(e) => setS({ ...s, email_reports: e.target.checked })} /> Email me summary reports</label>
      <div className="flex items-center gap-3"><Button onClick={save}>Save settings</Button>{saved && <span className="text-sm text-brand-700">Saved ✓</span>}</div>
    </Card>
  );
}
