"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "./InfraProviders";
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, Phone, DollarSign, CalendarClock,
  Wallet, Gauge, Server,
} from "lucide-react";

type Overview = {
  activeProviders: number; healthy: number; warning: number; critical: number; offline: number; notConfigured: number;
  callsToday: number; callsMonth: number; estimatedMonthlyCost: number; upcomingRenewals: number;
  lowBalanceAlerts: number; avgResponseMs: number | null; systemStatus: string;
};
type Widgets = {
  topSpender: { name: string; monthly: number } | null;
  lowestBalance: { name: string; amount: number | null; currency: string | null } | null;
  mostUsed: { name: string; calls: number } | null;
};

export function InfraOverview() {
  const [o, setO] = useState<Overview | null>(null);
  const [w, setW] = useState<Widgets | null>(null);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/infra/overview").then((r) => r.json()).then((d) => { setO(d.overview); setW(d.widgets); setAlertCount(d.alertCount ?? 0); });
  }, []);

  if (!o) return <p className="text-sm text-muted-foreground">Loading operations center…</p>;

  return (
    <div className="space-y-6">
      {/* System status banner */}
      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-brand-600" />
          <div>
            <p className="text-sm text-muted-foreground">System status</p>
            <div className="mt-0.5"><StatusPill status={o.systemStatus} /></div>
          </div>
        </div>
        {alertCount > 0 && (
          <Link href="/admin/infra/alerts" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100">
            <AlertTriangle className="h-4 w-4" /> {alertCount} active alert{alertCount === 1 ? "" : "s"}
          </Link>
        )}
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Stat icon={<Activity className="h-4 w-4" />} label="Active providers" value={o.activeProviders} />
        <Stat icon={<CheckCircle2 className="h-4 w-4 text-brand-600" />} label="Healthy" value={o.healthy} />
        <Stat icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} label="Warning" value={o.warning} />
        <Stat icon={<XCircle className="h-4 w-4 text-red-600" />} label="Critical / offline" value={o.critical + o.offline} />
        <Stat icon={<Phone className="h-4 w-4" />} label="API calls today" value={o.callsToday} />
        <Stat icon={<Phone className="h-4 w-4" />} label="API calls (month)" value={o.callsMonth} />
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Est. monthly cost" value={`$${o.estimatedMonthlyCost.toLocaleString()}`} />
        <Stat icon={<CalendarClock className="h-4 w-4" />} label="Upcoming renewals" value={o.upcomingRenewals} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Low-balance alerts" value={o.lowBalanceAlerts} />
        <Stat icon={<Gauge className="h-4 w-4" />} label="Avg response" value={o.avgResponseMs != null ? `${o.avgResponseMs} ms` : "—"} />
        <Stat icon={<Server className="h-4 w-4" />} label="Not configured" value={o.notConfigured} />
      </div>

      {/* Widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        <Widget title="Top spending provider" value={w?.topSpender ? `${w.topSpender.name}` : "—"} sub={w?.topSpender ? `$${w.topSpender.monthly}/mo` : "No cost data yet"} />
        <Widget title="Lowest balance" value={w?.lowestBalance ? w.lowestBalance.name : "—"} sub={w?.lowestBalance ? `${w.lowestBalance.amount ?? "?"} ${w.lowestBalance.currency ?? ""}` : "No balance data yet"} />
        <Widget title="Most used API" value={w?.mostUsed ? w.mostUsed.name : "—"} sub={w?.mostUsed ? `${w.mostUsed.calls.toLocaleString()} calls/mo` : "No usage data yet"} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/infra/renewals" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Renewal Center →</Link>
        <Link href="/admin/infra/costs" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Cost Management →</Link>
        <Link href="/admin/infra/health" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Service Health →</Link>
        <Link href="/admin/infra/alerts" className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Alert Center →</Link>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
    </Card>
  );
}

function Widget({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <Card>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </Card>
  );
}
