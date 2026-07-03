import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { OPS_PROVIDERS, isOpsProviderConfigured } from "@/lib/operations/registry";
import {
  computeSubscriptionStatus, computeKeyStatus, computeBalanceStatus,
  computeQuotaStatus, computeWebhookStatus,
} from "@/lib/operations/status";

export const dynamic = "force-dynamic";

/** GET /api/admin/operations/overview — every summary card in one call. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const [providers, keys, balances, quotas, webhooks, alerts] = await Promise.all([
    admin.from("operations_providers").select("provider_id, name, category, renewal_date, monthly_cost, health_status"),
    admin.from("operations_provider_keys").select("provider_id, last_rotated_at, rotation_days, status"),
    admin.from("operations_credit_balances").select("provider_id, current_balance, full_balance, warning_pct, critical_pct"),
    admin.from("operations_usage_quotas").select("provider_id, quota_type, current_usage, monthly_limit"),
    admin.from("operations_webhook_health").select("provider_id, failure_count, last_success_at, last_failure_at"),
    admin.from("operations_alerts").select("severity").eq("resolved", false),
  ]);

  const rows = providers.data ?? [];
  const monthlySpend = rows.reduce((n, p) => n + (Number(p.monthly_cost) || 0), 0);

  // Renewals within 30 days.
  const upcomingRenewals = rows
    .map((p) => ({ ...p, s: computeSubscriptionStatus(p.renewal_date) }))
    .filter((p) => p.s.daysRemaining != null && p.s.daysRemaining <= 30)
    .sort((a, b) => (a.s.daysRemaining ?? 0) - (b.s.daysRemaining ?? 0))
    .map((p) => ({ providerId: p.provider_id, name: p.name, renewalDate: p.renewal_date, daysRemaining: p.s.daysRemaining, status: p.s.status }));

  // Keys needing rotation.
  const keysNeedingRotation = (keys.data ?? [])
    .map((k) => ({ ...k, s: computeKeyStatus(k.last_rotated_at, k.rotation_days) }))
    .filter((k) => k.s.status === "overdue" || k.s.status === "rotate_soon")
    .map((k) => ({ providerId: k.provider_id, status: k.s.status, dueDate: k.s.dueDate }));

  // Low-credit providers.
  const lowCredits = (balances.data ?? [])
    .map((b) => ({ ...b, s: computeBalanceStatus(b.current_balance, b.full_balance, b.warning_pct, b.critical_pct) }))
    .filter((b) => ["warning", "critical", "exhausted"].includes(b.s.status))
    .map((b) => ({ providerId: b.provider_id, status: b.s.status, pct: b.s.pct }));

  // Quota pressure.
  const quotaWarnings = (quotas.data ?? [])
    .map((q) => ({ ...q, s: computeQuotaStatus(Number(q.current_usage ?? 0), q.monthly_limit == null ? null : Number(q.monthly_limit)) }))
    .filter((q) => q.s.status !== "healthy" && q.s.status !== "unknown")
    .map((q) => ({ providerId: q.provider_id, quotaType: q.quota_type, pct: q.s.pct, status: q.s.status }));

  // Failing webhooks.
  const failedWebhooks = (webhooks.data ?? [])
    .filter((w) => computeWebhookStatus(w.failure_count ?? 0, w.last_success_at, w.last_failure_at) === "failing")
    .map((w) => ({ providerId: w.provider_id, failureCount: w.failure_count }));

  // Live configuration per category (green/gray from env).
  const categoryStatus = OPS_PROVIDERS.reduce<Record<string, { configured: number; total: number }>>((acc, p) => {
    acc[p.category] = acc[p.category] ?? { configured: 0, total: 0 };
    acc[p.category].total++;
    if (isOpsProviderConfigured(p)) acc[p.category].configured++;
    return acc;
  }, {});

  const openAlerts = alerts.data ?? [];
  const criticalAlerts = openAlerts.filter((a) => a.severity === "critical").length;
  const warningAlerts = openAlerts.filter((a) => a.severity === "warning").length;

  const platformStatus =
    criticalAlerts > 0 || failedWebhooks.length > 0 ? "critical"
    : warningAlerts > 0 || lowCredits.length > 0 || keysNeedingRotation.length > 0 ? "attention"
    : "healthy";

  return NextResponse.json({
    ok: true,
    platformStatus,
    counts: {
      criticalAlerts, warningAlerts,
      upcomingRenewals: upcomingRenewals.length,
      lowCredits: lowCredits.length,
      keysNeedingRotation: keysNeedingRotation.length,
      failedWebhooks: failedWebhooks.length,
    },
    monthlySpend,
    estimatedNextMonth: Math.round(monthlySpend * 1.1 * 100) / 100,
    upcomingRenewals: upcomingRenewals.slice(0, 6),
    lowCredits: lowCredits.slice(0, 6),
    keysNeedingRotation: keysNeedingRotation.slice(0, 6),
    quotaWarnings: quotaWarnings.slice(0, 6),
    failedWebhooks,
    categoryStatus,
  });
}
