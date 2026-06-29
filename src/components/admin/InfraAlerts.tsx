"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

type Alert = {
  id: string; provider_id: string | null; severity: string; title: string;
  description: string | null; recommended_action: string | null; source: string; created_at: string;
};
type Thresholds = Record<string, number>;

const SEV_ICON: Record<string, React.ReactNode> = {
  critical: <ShieldAlert className="h-4 w-4 text-red-600" />, warning: <AlertTriangle className="h-4 w-4 text-amber-600" />, info: <Info className="h-4 w-4 text-sky-600" />,
};
const SEV_BORDER: Record<string, string> = { critical: "border-l-red-500", warning: "border-l-amber-500", info: "border-l-sky-500" };

const THRESHOLD_FIELDS: { key: string; label: string }[] = [
  { key: "warning_threshold", label: "Warning usage %" },
  { key: "critical_threshold", label: "Critical usage %" },
  { key: "renewal_reminder_days", label: "Renewal reminder (days)" },
  { key: "storage_alert_pct", label: "Storage alert %" },
  { key: "api_quota_alert_pct", label: "API quota alert %" },
  { key: "credit_alert_pct", label: "Credit alert %" },
  { key: "daily_spend_alert", label: "Daily spend alert ($)" },
  { key: "monthly_spend_alert", label: "Monthly spend alert ($)" },
];

export function InfraAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [t, setT] = useState<Thresholds | null>(null);
  const [saved, setSaved] = useState(false);

  function load() { fetch("/api/admin/infra/alerts").then((r) => r.json()).then((d) => setAlerts(d.alerts ?? [])); }
  useEffect(() => {
    load();
    fetch("/api/admin/infra/thresholds").then((r) => r.json()).then((d) => setT(d.thresholds));
  }, []);

  async function resolve(id: string) {
    await fetch("/api/admin/infra/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  async function saveThresholds() {
    if (!t) return;
    setSaved(false);
    await fetch("/api/admin/infra/thresholds", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <CardTitle className="text-base">Active alerts ({alerts.length})</CardTitle>
        {alerts.length === 0 ? (
          <Card><p className="text-sm text-muted-foreground">No active alerts. All monitored services are within thresholds. ✅</p></Card>
        ) : alerts.map((a) => (
          <Card key={a.id} className={`border-l-4 ${SEV_BORDER[a.severity] ?? "border-l-border"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5">{SEV_ICON[a.severity]}</span>
                <div>
                  <p className="font-medium">{a.title}</p>
                  {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                  {a.recommended_action && <p className="mt-1 text-sm"><span className="font-medium">Action:</span> {a.recommended_action}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{a.source === "live" ? "Live (auto-clears)" : "Recorded"} · {new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>
              {a.source === "stored" && <Button size="sm" variant="outline" onClick={() => resolve(a.id)}>Resolve</Button>}
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <CardTitle className="text-base">Threshold settings</CardTitle>
        <Card className="space-y-4">
          {t && (
            <div className="grid gap-3 sm:grid-cols-4">
              {THRESHOLD_FIELDS.map((f) => (
                <div key={f.key}><Label>{f.label}</Label><Input type="number" value={t[f.key] ?? 0} onChange={(e) => setT({ ...t, [f.key]: Number(e.target.value) })} /></div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={saveThresholds}>Save thresholds</Button>
            {saved && <span className="text-sm text-brand-700">Saved ✓</span>}
          </div>
        </Card>
      </section>
    </div>
  );
}
