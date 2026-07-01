"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

type Log = {
  id: string;
  user_id: string | null;
  notification_type: string;
  channel: string;
  status: string;
  provider: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

type Stats = {
  totalSent: number;
  failedEmails: number;
  paymentFailures: number;
  lowCreditUsers: number;
  expiringSubs: number;
};

type Rule = {
  id: string;
  config: Record<string, unknown> & {
    percentages?: number[];
    days?: number[];
  };
  enabled: boolean;
};

function statusVariant(status: string): "success" | "danger" | "warning" | "default" {
  const s = status.toLowerCase();
  if (["sent", "delivered", "success", "ok"].includes(s)) return "success";
  if (["failed", "error", "bounced"].includes(s)) return "danger";
  if (["pending", "queued", "retrying"].includes(s)) return "warning";
  return "default";
}

/** Read a number[] out of a rule's config, checking common shapes. */
function ruleNumbers(rule: Rule, key: "percentages" | "days"): number[] {
  const cfg = rule.config ?? {};
  const direct = (cfg as Record<string, unknown>)[key];
  if (Array.isArray(direct)) return direct as number[];
  return [];
}

export function AdminNotifications() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [logsRes, rulesRes] = await Promise.all([
          fetch("/api/admin/notifications/logs"),
          fetch("/api/admin/notifications/rules"),
        ]);
        const logsJson = await logsRes.json().catch(() => ({}));
        const rulesJson = await rulesRes.json().catch(() => ({}));
        setLogs(logsJson.logs ?? []);
        setStats(logsJson.stats ?? null);
        setRules(rulesJson.rules ?? []);
      } catch {
        setError("Couldn't load notification data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading notifications" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && <Alert variant="error">{error}</Alert>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total sent" value={stats?.totalSent} />
        <StatCard label="Failed emails" value={stats?.failedEmails} tone="danger" />
        <StatCard label="Payment failures" value={stats?.paymentFailures} tone="danger" />
        <StatCard label="Low-credit users" value={stats?.lowCreditUsers} tone="warning" />
        <StatCard label="Expiring subs" value={stats?.expiringSubs} tone="warning" />
      </div>

      {/* Delivery logs */}
      <section className="space-y-3">
        <CardTitle className="text-base">Recent delivery logs</CardTitle>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Status</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Error</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No delivery logs yet.
                  </td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border/50 align-top">
                  <td className="p-3 font-medium">{l.notification_type}</td>
                  <td className="p-3 capitalize text-muted-foreground">{l.channel}</td>
                  <td className="p-3">
                    <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{l.provider ?? "—"}</td>
                  <td className="p-3 max-w-[16rem] truncate text-muted-foreground" title={l.error_message ?? ""}>
                    {l.error_message ?? "—"}
                  </td>
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {new Date(l.sent_at ?? l.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Rules editor */}
      <section className="space-y-3">
        <CardTitle className="text-base">Notification rules</CardTitle>
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground">No configurable rules found.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((rule) => (
            <RuleEditor key={rule.id} rule={rule} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone?: "danger" | "warning";
}) {
  const color =
    tone === "danger" && (value ?? 0) > 0
      ? "text-red-600 dark:text-red-400"
      : tone === "warning" && (value ?? 0) > 0
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <Card className="p-4">
      <div className={`text-xl font-bold ${color}`}>{value ?? "…"}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

/** Detect which kind of rule this is by its config keys. */
function ruleKind(rule: Rule): "percentages" | "days" | null {
  const cfg = rule.config ?? {};
  if (Array.isArray((cfg as Record<string, unknown>).percentages)) return "percentages";
  if (Array.isArray((cfg as Record<string, unknown>).days)) return "days";
  return null;
}

function RuleEditor({ rule }: { rule: Rule }) {
  const kind = ruleKind(rule);
  const initial = kind ? ruleNumbers(rule, kind).join(", ") : "";
  const [csv, setCsv] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isPct = kind === "percentages";
  const title = isPct
    ? "Credit threshold percentages"
    : kind === "days"
      ? "Subscription reminder days"
      : "Rule config";
  const help = isPct
    ? "Alert users when credits fall below these % of their allowance."
    : kind === "days"
      ? "Remind users this many days before their subscription renews/expires."
      : "";

  async function save() {
    if (!kind) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    const nums = csv
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    const config = { ...rule.config, [kind]: nums };
    try {
      const res = await fetch("/api/admin/notifications/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, config }),
      });
      if (!res.ok) throw new Error();
      setMsg("Saved ✓");
    } catch {
      setErr("Couldn't save this rule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Badge variant={rule.enabled ? "success" : "default"}>{rule.enabled ? "Enabled" : "Disabled"}</Badge>
      </div>
      <div>
        <Label htmlFor={`rule-${rule.id}`}>
          {isPct ? "Percentages (comma-separated)" : kind === "days" ? "Days (comma-separated)" : "Values"}
        </Label>
        <Input
          id={`rule-${rule.id}`}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={isPct ? "e.g. 50, 20, 10" : "e.g. 7, 3, 1"}
          disabled={!kind}
        />
        {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={saving || !kind}>
          {saving ? <Spinner size="sm" className="text-current" /> : "Save"}
        </Button>
        {msg && <span className="text-xs text-brand-700 dark:text-brand-400">{msg}</span>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </Card>
  );
}
