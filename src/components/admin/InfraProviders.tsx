"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

type Provider = {
  id: string; name: string; category: string; authType: string;
  apiEndpoint?: string; docsUrl?: string; supportUrl?: string; renewalRequired: boolean; note?: string;
  capabilities: { usage: boolean; balance: boolean; health: boolean; webhooks: boolean };
  configured: boolean; status: string;
  usage: { calls_today: number; calls_month: number; quota_limit: number | null; quota_used: number | null } | null;
  cost: { daily_usd: number | null; monthly_usd: number | null } | null;
  balance: { amount: number | null; currency: string | null; low: boolean } | null;
  renewal: { renewal_date: string | null; plan: string | null; monthly_cost: number | null } | null;
  health: { latency_ms: number | null; error_rate: number | null; webhook_ok: boolean | null; last_success: string | null; last_failure: string | null } | null;
};

export const STATUS_STYLE: Record<string, string> = {
  healthy: "bg-brand-100 text-brand-800", warning: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-700", offline: "bg-red-200 text-red-800",
  not_configured: "bg-muted text-muted-foreground",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[status] ?? "bg-muted"}`}>{status.replace("_", " ")}</span>;
}

function fmtDate(d: string | null | undefined) { return d ? new Date(d).toLocaleDateString() : "—"; }

export function InfraProviders({ category, title, emphasis }: { category?: string; title: string; emphasis?: "health" }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qs = category ? `?category=${category}` : "";
    fetch(`/api/admin/infra/providers${qs}`).then((r) => r.json()).then((d) => { setProviders(d.providers ?? []); setLoading(false); });
  }, [category]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading providers…</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((p) => {
          const remaining = p.usage?.quota_limit != null && p.usage.quota_used != null ? p.usage.quota_limit - p.usage.quota_used : null;
          const usagePct = p.usage?.quota_limit ? Math.round(((p.usage.quota_used ?? 0) / p.usage.quota_limit) * 100) : null;
          return (
            <Card key={p.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                </div>
                <StatusPill status={p.status} />
              </div>

              {!p.configured ? (
                <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                  Not configured — add credentials to enable. {p.docsUrl && <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">Setup docs</a>}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {emphasis === "health" ? (
                    <>
                      <Metric label="Latency" value={p.health?.latency_ms != null ? `${p.health.latency_ms} ms` : "—"} />
                      <Metric label="Error rate" value={p.health?.error_rate != null ? `${p.health.error_rate}%` : "—"} />
                      <Metric label="Webhook" value={p.capabilities.webhooks ? (p.health?.webhook_ok === false ? "Failing" : p.health?.webhook_ok ? "OK" : "—") : "n/a"} />
                      <Metric label="Last success" value={fmtDate(p.health?.last_success)} />
                    </>
                  ) : (
                    <>
                      <Metric label="Plan" value={p.renewal?.plan ?? "—"} />
                      <Metric label="Monthly cost" value={p.cost?.monthly_usd != null ? `$${p.cost.monthly_usd}` : "—"} />
                      <Metric label="Calls today" value={p.usage?.calls_today != null ? p.usage.calls_today.toLocaleString() : "—"} />
                      <Metric label="Calls (month)" value={p.usage?.calls_month != null ? p.usage.calls_month.toLocaleString() : "—"} />
                      {p.capabilities.balance && <Metric label="Balance" value={p.balance?.amount != null ? `${p.balance.amount} ${p.balance.currency ?? ""}` : "—"} warn={p.balance?.low} />}
                      {p.renewalRequired && <Metric label="Renews" value={fmtDate(p.renewal?.renewal_date)} />}
                    </>
                  )}
                </div>
              )}

              {usagePct != null && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Quota: {(p.usage?.quota_used ?? 0).toLocaleString()} / {(p.usage?.quota_limit ?? 0).toLocaleString()}</span>
                    <span>{remaining?.toLocaleString()} left</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${usagePct >= 95 ? "bg-red-500" : usagePct >= 80 ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-2">
                <button onClick={() => setOpen(open === p.id ? null : p.id)} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
                  {open === p.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} View details
                </button>
                <div className="flex gap-3 text-xs">
                  {p.docsUrl && <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /> Docs</a>}
                  {p.supportUrl && <a href={p.supportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /> Support</a>}
                </div>
              </div>

              {open === p.id && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-muted/40 p-3 text-xs">
                  <Metric label="Category" value={p.category} />
                  <Metric label="Auth" value={p.authType} />
                  <Metric label="Endpoint" value={p.apiEndpoint ?? "—"} />
                  <Metric label="Webhooks" value={p.capabilities.webhooks ? "Yes" : "No"} />
                  <Metric label="Usage API" value={p.capabilities.usage ? "Yes" : "No"} />
                  <Metric label="Balance API" value={p.capabilities.balance ? "Yes" : "No"} />
                  <Metric label="Last failure" value={fmtDate(p.health?.last_failure)} />
                  <Metric label="Latency" value={p.health?.latency_ms != null ? `${p.health.latency_ms} ms` : "—"} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Live status reflects whether each provider&apos;s credentials are configured. Usage, cost, balance and renewal figures populate from recorded snapshots (admin entry or the metrics cron).
      </p>
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-2 truncate">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium truncate ${warn ? "text-amber-700" : ""}`}>{value}</span>
    </div>
  );
}
