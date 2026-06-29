/**
 * Infrastructure status — SERVER ONLY (reads process.env).
 *
 * Two layers of truth:
 *  1. Derived live: is each provider's env configured? (we always know this).
 *  2. Recorded snapshots: latest usage/cost/balance/renewal/health rows written
 *     by admins or a cron job into the provider_* tables (we merge the newest).
 *
 * Live provider APIs (real usage/balances) need per-provider keys + endpoints;
 * those snapshots are recorded via /api/admin/infra/record, not fetched here.
 */
import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { PROVIDERS, type ProviderDef } from "./registry";

export type HealthStatus = "healthy" | "warning" | "critical" | "offline" | "not_configured";

export type ProviderSnapshot = {
  def: ProviderDef;
  configured: boolean;
  status: HealthStatus;
  /** Latest recorded metrics (null when none recorded yet). */
  usage?: { calls_today: number; calls_month: number; quota_limit: number | null; quota_used: number | null } | null;
  cost?: { daily_usd: number | null; monthly_usd: number | null } | null;
  balance?: { amount: number | null; currency: string | null; low: boolean } | null;
  renewal?: { renewal_date: string | null; plan: string | null; monthly_cost: number | null } | null;
  health?: { latency_ms: number | null; error_rate: number | null; webhook_ok: boolean | null; last_success: string | null; last_failure: string | null } | null;
};

type Admin = ReturnType<typeof createAdminClient>;

export function isConfigured(def: ProviderDef): boolean {
  // Providers with no required env (e.g. per-user WordPress) count as available.
  return def.envKeys.every((k) => {
    const v = process.env[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

function pickLatest<T extends { provider_id: string; created_at?: string }>(rows: T[] | null): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of rows ?? []) if (!m.has(r.provider_id)) m.set(r.provider_id, r); // rows arrive newest-first
  return m;
}

/** Build a full snapshot for every provider, merging env state + latest DB rows. */
export async function getInfraSnapshot(admin: Admin): Promise<ProviderSnapshot[]> {
  const [usage, costs, balances, renewals, health] = await Promise.all([
    admin.from("provider_usage").select("provider_id, calls_today, calls_month, quota_limit, quota_used, created_at").order("created_at", { ascending: false }),
    admin.from("provider_costs").select("provider_id, daily_usd, monthly_usd, created_at").order("created_at", { ascending: false }),
    admin.from("provider_balances").select("provider_id, amount, currency, low, created_at").order("created_at", { ascending: false }),
    admin.from("provider_renewals").select("provider_id, renewal_date, plan, monthly_cost, created_at").order("created_at", { ascending: false }),
    admin.from("provider_health").select("provider_id, status, latency_ms, error_rate, webhook_ok, last_success, last_failure, created_at").order("created_at", { ascending: false }),
  ]);

  const uMap = pickLatest(usage.data as never[]);
  const cMap = pickLatest(costs.data as never[]);
  const bMap = pickLatest(balances.data as never[]);
  const rMap = pickLatest(renewals.data as never[]);
  const hMap = pickLatest(health.data as never[]);

  return PROVIDERS.map((def) => {
    const configured = isConfigured(def);
    const h = hMap.get(def.id) as { status?: HealthStatus } | undefined;
    let status: HealthStatus = configured ? "healthy" : "not_configured";
    if (configured && h?.status) status = h.status;
    return {
      def, configured, status,
      usage: (uMap.get(def.id) as ProviderSnapshot["usage"]) ?? null,
      cost: (cMap.get(def.id) as ProviderSnapshot["cost"]) ?? null,
      balance: (bMap.get(def.id) as ProviderSnapshot["balance"]) ?? null,
      renewal: (rMap.get(def.id) as ProviderSnapshot["renewal"]) ?? null,
      health: (hMap.get(def.id) as ProviderSnapshot["health"]) ?? null,
    };
  });
}

export type InfraOverview = {
  activeProviders: number;
  healthy: number; warning: number; critical: number; offline: number; notConfigured: number;
  callsToday: number; callsMonth: number;
  estimatedMonthlyCost: number;
  upcomingRenewals: number;
  lowBalanceAlerts: number;
  avgResponseMs: number | null;
  systemStatus: HealthStatus;
};

export function summarize(snaps: ProviderSnapshot[], renewalReminderDays = 30): InfraOverview {
  const now = Date.now();
  let healthy = 0, warning = 0, critical = 0, offline = 0, notConfigured = 0;
  let callsToday = 0, callsMonth = 0, monthlyCost = 0, upcoming = 0, lowBal = 0;
  const latencies: number[] = [];

  for (const s of snaps) {
    if (s.status === "healthy") healthy++;
    else if (s.status === "warning") warning++;
    else if (s.status === "critical") critical++;
    else if (s.status === "offline") offline++;
    else notConfigured++;

    callsToday += s.usage?.calls_today ?? 0;
    callsMonth += s.usage?.calls_month ?? 0;
    monthlyCost += s.cost?.monthly_usd ?? 0;
    if (s.balance?.low) lowBal++;
    if (s.health?.latency_ms != null) latencies.push(s.health.latency_ms);
    if (s.renewal?.renewal_date) {
      const days = (new Date(s.renewal.renewal_date).getTime() - now) / 86_400_000;
      if (days <= renewalReminderDays && days >= -1) upcoming++;
    }
  }

  const active = snaps.filter((s) => s.configured).length;
  const systemStatus: HealthStatus = critical > 0 || offline > 0 ? "critical" : warning > 0 ? "warning" : "healthy";

  return {
    activeProviders: active, healthy, warning, critical, offline, notConfigured,
    callsToday, callsMonth, estimatedMonthlyCost: Math.round(monthlyCost * 100) / 100,
    upcomingRenewals: upcoming, lowBalanceAlerts: lowBal,
    avgResponseMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
    systemStatus,
  };
}
