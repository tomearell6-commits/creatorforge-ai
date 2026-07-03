"use client";

import Link from "next/link";
import { AlertTriangle, CalendarDays, Coins, KeyRound, Webhook, DollarSign, Activity, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { OpsBadge, OpsLoading, useOps, fmtMoney, fmtDate } from "./ui";
import { OPS_CATEGORIES } from "@/lib/operations/registry";

type Overview = {
  platformStatus: string;
  counts: { criticalAlerts: number; warningAlerts: number; upcomingRenewals: number; lowCredits: number; keysNeedingRotation: number; failedWebhooks: number };
  monthlySpend: number;
  estimatedNextMonth: number;
  upcomingRenewals: { providerId: string; name: string; renewalDate: string | null; daysRemaining: number | null; status: string }[];
  lowCredits: { providerId: string; status: string; pct: number | null }[];
  keysNeedingRotation: { providerId: string; status: string; dueDate: string | null }[];
  quotaWarnings: { providerId: string; quotaType: string; pct: number | null; status: string }[];
  failedWebhooks: { providerId: string; failureCount: number }[];
  categoryStatus: Record<string, { configured: number; total: number }>;
};

export function OpsOverview() {
  const { data, loading, error, reload } = useOps<Overview>("/api/admin/operations/overview");
  if (loading) return <OpsLoading label="Loading operations overview…" />;
  if (error || !data) return <Alert variant="error" action={<Button size="sm" variant="ghost" onClick={reload}>Retry</Button>}>{error ?? "Failed to load"}</Alert>;

  const cards = [
    { label: "Platform Status", value: data.platformStatus.replace("_", " "), status: data.platformStatus, icon: Activity, href: "/admin/operations/health" },
    { label: "Critical Alerts", value: data.counts.criticalAlerts, status: data.counts.criticalAlerts ? "critical" : "healthy", icon: AlertTriangle, href: "/admin/operations/alerts" },
    { label: "Upcoming Renewals (30d)", value: data.counts.upcomingRenewals, status: data.counts.upcomingRenewals ? "attention" : "healthy", icon: CalendarDays, href: "/admin/operations/subscriptions" },
    { label: "Low Credit Providers", value: data.counts.lowCredits, status: data.counts.lowCredits ? "attention" : "healthy", icon: Coins, href: "/admin/operations/credits" },
    { label: "Keys Needing Rotation", value: data.counts.keysNeedingRotation, status: data.counts.keysNeedingRotation ? "attention" : "healthy", icon: KeyRound, href: "/admin/operations/api-keys" },
    { label: "Failed Webhooks", value: data.counts.failedWebhooks, status: data.counts.failedWebhooks ? "critical" : "healthy", icon: Webhook, href: "/admin/operations/webhooks" },
    { label: "Monthly Spend", value: fmtMoney(data.monthlySpend), status: "healthy", icon: DollarSign, href: "/admin/operations/cost-forecast" },
    { label: "Est. Next Month", value: fmtMoney(data.estimatedNextMonth), status: "healthy", icon: DollarSign, href: "/admin/operations/cost-forecast" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={reload}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="h-full p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <c.icon className="h-5 w-5 text-brand-600" />
                <OpsBadge status={c.status} />
              </div>
              <div className="mt-2 text-2xl font-bold capitalize">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Attention lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold">Upcoming renewals</h3>
          {data.upcomingRenewals.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing renewing in the next 30 days.</p> : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {data.upcomingRenewals.map((r) => (
                <li key={r.providerId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{r.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(r.renewalDate)} · {r.daysRemaining}d</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold">Needs attention</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.lowCredits.map((b) => (
              <li key={`c-${b.providerId}`} className="flex items-center justify-between gap-2">
                <span>{b.providerId} credits{b.pct != null ? ` at ${b.pct}%` : ""}</span><OpsBadge status={b.status} />
              </li>
            ))}
            {data.keysNeedingRotation.map((k) => (
              <li key={`k-${k.providerId}`} className="flex items-center justify-between gap-2">
                <span>{k.providerId} key rotation due {fmtDate(k.dueDate)}</span><OpsBadge status={k.status} />
              </li>
            ))}
            {data.quotaWarnings.map((q) => (
              <li key={`q-${q.providerId}-${q.quotaType}`} className="flex items-center justify-between gap-2">
                <span>{q.providerId} {q.quotaType} at {q.pct}%</span><OpsBadge status={q.status} />
              </li>
            ))}
            {data.failedWebhooks.map((w) => (
              <li key={`w-${w.providerId}`} className="flex items-center justify-between gap-2">
                <span>{w.providerId} webhook failing ({w.failureCount})</span><OpsBadge status="failing" />
              </li>
            ))}
            {data.lowCredits.length + data.keysNeedingRotation.length + data.quotaWarnings.length + data.failedWebhooks.length === 0 && (
              <li className="text-muted-foreground">All clear — nothing needs attention. ✅</li>
            )}
          </ul>
        </Card>
      </div>

      {/* Category configuration status */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold">Provider configuration by category</h3>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {OPS_CATEGORIES.map((c) => {
            const s = data.categoryStatus[c.id];
            const status = !s ? "unknown" : s.configured === s.total ? "healthy" : s.configured === 0 ? "not_configured" : "attention";
            return (
              <div key={c.id} className="rounded-lg border border-border p-2 text-center">
                <div className="text-lg font-bold">{s ? `${s.configured}/${s.total}` : "—"}</div>
                <div className="truncate text-[11px] text-muted-foreground">{c.label}</div>
                <div className="mt-1 flex justify-center"><OpsBadge status={status} /></div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
