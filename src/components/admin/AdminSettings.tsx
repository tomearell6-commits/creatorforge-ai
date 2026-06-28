"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Flag = { key: string; enabled: boolean; description: string | null };
type Setting = { key: string; value: unknown };

export function AdminSettings() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const json = await (await fetch("/api/admin/settings")).json();
    setFlags(json.flags ?? []);
    setSettings(json.settings ?? []);
  }
  useEffect(() => { load(); }, []);

  async function toggle(key: string, enabled: boolean) {
    setFlags((f) => f.map((x) => (x.key === key ? { ...x, enabled } : x)));
    await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flags: [{ key, enabled }] }) });
    setMsg("Saved.");
    setTimeout(() => setMsg(null), 1500);
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold">Feature flags</h3>
        <div className="mt-3 space-y-2">
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between rounded-lg border border-border p-2">
              <div>
                <div className="font-medium">{f.key}</div>
                <div className="text-xs text-muted-foreground">{f.description}</div>
              </div>
              <button onClick={() => toggle(f.key, !f.enabled)}
                className={`rounded-full px-3 py-1 text-xs ${f.enabled ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                {f.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
        {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
      </Card>

      <Card>
        <h3 className="font-semibold">System settings</h3>
        <div className="mt-3 space-y-2 text-sm">
          {settings.map((s) => (
            <div key={s.key}>
              <div className="font-medium">{s.key}</div>
              <pre className="overflow-x-auto rounded bg-background p-2 text-xs">{JSON.stringify(s.value, null, 2)}</pre>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Coupons, discounts, and credit packages live under the <code>billing</code> setting (edit via API/DB; UI editor in Phase 8).</p>
      </Card>
    </div>
  );
}
