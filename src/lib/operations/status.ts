/**
 * Operations status engine — pure functions (no I/O) that turn raw records
 * into the statuses, severities, and recommended actions shown across the
 * Operations Review Center. Unit-tested; the cron and API routes share them.
 */

export type Severity = "info" | "warning" | "critical";
export type HealthColor = "green" | "yellow" | "red" | "gray";

export const STATUS_COLOR: Record<string, HealthColor> = {
  healthy: "green", active: "green", ok: "green",
  attention: "yellow", rotate_soon: "yellow", renew_soon: "yellow", warning: "yellow", failing: "yellow", manual_review: "yellow",
  critical: "red", overdue: "red", renewal_due: "red", expired: "red", payment_failed: "red", exhausted: "red",
  not_configured: "gray", unknown: "gray", missing: "gray", disabled: "gray",
};

/** Mask a secret for display: first 3 + **** + last 4. Never show more. */
export function maskKey(value: string): string {
  if (!value) return "****";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

// ---- API key rotation --------------------------------------------------------
export type KeyStatus = "healthy" | "rotate_soon" | "overdue" | "disabled" | "missing" | "unknown";

export function computeKeyStatus(
  lastRotated: string | null | undefined,
  rotationDays: number,
  now = new Date()
): { status: KeyStatus; dueDate: string | null; daysUntilDue: number | null } {
  if (!lastRotated) return { status: "unknown", dueDate: null, daysUntilDue: null };
  const due = new Date(lastRotated);
  due.setDate(due.getDate() + rotationDays);
  const days = daysBetween(now, due);
  const status: KeyStatus = days < 0 ? "overdue" : days <= 14 ? "rotate_soon" : "healthy";
  return { status, dueDate: due.toISOString().slice(0, 10), daysUntilDue: days };
}

// ---- Subscriptions / renewals ---------------------------------------------------
export type SubscriptionStatus = "active" | "renew_soon" | "renewal_due" | "expired";

export function computeSubscriptionStatus(
  renewalDate: string | null | undefined,
  now = new Date()
): { status: SubscriptionStatus | "unknown"; daysRemaining: number | null; severity: Severity | null } {
  if (!renewalDate) return { status: "unknown", daysRemaining: null, severity: null };
  const days = daysBetween(now, new Date(renewalDate));
  if (days < 0) return { status: "expired", daysRemaining: days, severity: "critical" };
  if (days <= 3) return { status: "renewal_due", daysRemaining: days, severity: "critical" };
  if (days <= 14) return { status: "renew_soon", daysRemaining: days, severity: "warning" };
  if (days <= 30) return { status: "renew_soon", daysRemaining: days, severity: "info" };
  return { status: "active", daysRemaining: days, severity: null };
}

// ---- Credit balances ---------------------------------------------------------------
export type BalanceStatus = "healthy" | "warning" | "critical" | "exhausted" | "unknown";

export function computeBalanceStatus(
  currentBalance: number | null | undefined,
  fullBalance: number | null | undefined,
  warningPct = 30,
  criticalPct = 10
): { status: BalanceStatus; pct: number | null } {
  if (currentBalance == null) return { status: "unknown", pct: null };
  if (currentBalance <= 0) return { status: "exhausted", pct: 0 };
  if (!fullBalance || fullBalance <= 0) return { status: "healthy", pct: null };
  const pct = Math.round((currentBalance / fullBalance) * 100);
  if (pct <= criticalPct) return { status: "critical", pct };
  if (pct <= warningPct) return { status: "warning", pct };
  return { status: "healthy", pct };
}

/** Days of runway left at the current daily average burn. */
export function estimateDaysRemaining(currentBalance: number | null | undefined, dailyAvg: number): number | null {
  if (currentBalance == null || dailyAvg <= 0) return null;
  return Math.floor(currentBalance / dailyAvg);
}

// ---- Usage quotas ----------------------------------------------------------------------
export type QuotaStatus = "healthy" | "warning" | "critical" | "exceeded" | "unknown";

export function computeQuotaStatus(
  currentUsage: number,
  monthlyLimit: number | null | undefined
): { status: QuotaStatus; pct: number | null; remaining: number | null } {
  if (!monthlyLimit || monthlyLimit <= 0) return { status: "unknown", pct: null, remaining: null };
  const pct = Math.round((currentUsage / monthlyLimit) * 100);
  const remaining = Math.max(0, monthlyLimit - currentUsage);
  if (pct >= 100) return { status: "exceeded", pct, remaining };
  if (pct >= 95) return { status: "critical", pct, remaining };
  if (pct >= 85) return { status: "critical", pct, remaining };
  if (pct >= 70) return { status: "warning", pct, remaining };
  return { status: "healthy", pct, remaining };
}

// ---- Webhooks -----------------------------------------------------------------------------
export function computeWebhookStatus(failureCount: number, lastSuccessAt: string | null, lastFailureAt: string | null): "healthy" | "failing" | "unknown" {
  if (!lastSuccessAt && !lastFailureAt) return "unknown";
  if (lastFailureAt && (!lastSuccessAt || new Date(lastFailureAt) > new Date(lastSuccessAt)) && failureCount >= 3) return "failing";
  return "healthy";
}

// ---- Unified alert evaluation ------------------------------------------------------------------
export type OpsAlertInput = {
  providers: { provider_id: string; name: string; renewal_date: string | null; monthly_cost: number }[];
  keys: { provider_id: string; key_name: string; last_rotated_at: string | null; rotation_days: number }[];
  balances: { provider_id: string; current_balance: number | null; full_balance: number | null; warning_pct: number; critical_pct: number; daily_avg_usage: number }[];
  quotas: { provider_id: string; quota_type: string; current_usage: number; monthly_limit: number | null }[];
  webhooks: { provider_id: string; failure_count: number; last_success_at: string | null; last_failure_at: string | null }[];
};

export type OpsAlert = {
  alert_type: string;
  severity: Severity;
  provider_id: string;
  message: string;
  recommended_action: string;
  dedupe_key: string;
};

/** Evaluate every alert rule against current records. Pure — no I/O. */
export function evaluateOpsAlerts(input: OpsAlertInput, now = new Date()): OpsAlert[] {
  const alerts: OpsAlert[] = [];
  const monthKey = now.toISOString().slice(0, 7);

  // Renewals: threshold buckets (30/14/7/3/1 days) + expired. Buckets — not
  // exact day marks — so a check can never skip past an alert window; the
  // dedupe key includes the bucket, so each escalation fires exactly once.
  for (const p of input.providers) {
    const s = computeSubscriptionStatus(p.renewal_date, now);
    if (s.daysRemaining == null) continue;
    if (s.status === "expired") {
      alerts.push({
        alert_type: "renewal", severity: "critical", provider_id: p.provider_id,
        message: `${p.name} subscription expired ${Math.abs(s.daysRemaining)} day(s) ago.`,
        recommended_action: `Renew ${p.name} immediately to avoid service interruption.`,
        dedupe_key: `renewal:${p.provider_id}:expired:${monthKey}`,
      });
    } else if (s.daysRemaining <= 30) {
      const bucket = s.daysRemaining <= 1 ? 1 : s.daysRemaining <= 3 ? 3 : s.daysRemaining <= 7 ? 7 : s.daysRemaining <= 14 ? 14 : 30;
      alerts.push({
        alert_type: "renewal", severity: bucket <= 7 ? "critical" : "warning", provider_id: p.provider_id,
        message: `${p.name} renews in ${s.daysRemaining} day(s)${p.monthly_cost ? ` (~$${p.monthly_cost}/mo)` : ""}.`,
        recommended_action: `Confirm the payment method for ${p.name} and budget for the renewal.`,
        dedupe_key: `renewal:${p.provider_id}:${bucket}d:${monthKey}`,
      });
    }
  }

  // API key rotation.
  for (const k of input.keys) {
    const s = computeKeyStatus(k.last_rotated_at, k.rotation_days, now);
    if (s.status === "overdue") {
      alerts.push({
        alert_type: "key_rotation", severity: "critical", provider_id: k.provider_id,
        message: `${k.provider_id} key "${k.key_name}" rotation is overdue (due ${s.dueDate}).`,
        recommended_action: "Rotate the key at the provider, update Vercel env, then mark as rotated.",
        dedupe_key: `key:${k.provider_id}:${k.key_name}:overdue:${monthKey}`,
      });
    } else if (s.status === "rotate_soon") {
      alerts.push({
        alert_type: "key_rotation", severity: "warning", provider_id: k.provider_id,
        message: `${k.provider_id} key "${k.key_name}" is due for rotation by ${s.dueDate}.`,
        recommended_action: "Schedule a key rotation within the next two weeks.",
        dedupe_key: `key:${k.provider_id}:${k.key_name}:soon:${monthKey}`,
      });
    }
  }

  // Credit balances: 30/20/10% + exhausted.
  for (const b of input.balances) {
    const s = computeBalanceStatus(b.current_balance, b.full_balance, b.warning_pct, b.critical_pct);
    const runway = estimateDaysRemaining(b.current_balance, b.daily_avg_usage);
    const runwayNote = runway != null ? ` (~${runway} day(s) of runway)` : "";
    if (s.status === "exhausted") {
      alerts.push({
        alert_type: "low_credits", severity: "critical", provider_id: b.provider_id,
        message: `${b.provider_id} credits are exhausted.`,
        recommended_action: `Top up ${b.provider_id} now — dependent features are failing.`,
        dedupe_key: `credits:${b.provider_id}:exhausted:${monthKey}`,
      });
    } else if (s.status === "critical") {
      alerts.push({
        alert_type: "low_credits", severity: "critical", provider_id: b.provider_id,
        message: `${b.provider_id} balance is at ${s.pct}%${runwayNote}.`,
        recommended_action: `Top up ${b.provider_id} today.`,
        dedupe_key: `credits:${b.provider_id}:critical:${monthKey}`,
      });
    } else if (s.status === "warning") {
      alerts.push({
        alert_type: "low_credits", severity: "warning", provider_id: b.provider_id,
        message: `${b.provider_id} balance is at ${s.pct}%${runwayNote}.`,
        recommended_action: `Plan a top-up for ${b.provider_id} this week.`,
        dedupe_key: `credits:${b.provider_id}:warning:${monthKey}`,
      });
    }
  }

  // Quotas: 70/85/95/100%.
  for (const q of input.quotas) {
    const s = computeQuotaStatus(q.current_usage, q.monthly_limit);
    if (s.status === "healthy" || s.status === "unknown") continue;
    alerts.push({
      alert_type: "quota", severity: s.pct != null && s.pct >= 85 ? "critical" : "warning", provider_id: q.provider_id,
      message: `${q.provider_id} ${q.quota_type} quota at ${s.pct}% (${s.remaining} remaining).`,
      recommended_action: s.pct != null && s.pct >= 95
        ? `Upgrade the ${q.provider_id} plan or throttle usage — quota nearly exceeded.`
        : `Monitor ${q.provider_id} ${q.quota_type} usage; consider a higher tier before reset.`,
      dedupe_key: `quota:${q.provider_id}:${q.quota_type}:${s.pct != null && s.pct >= 95 ? "95" : s.pct != null && s.pct >= 85 ? "85" : "70"}:${monthKey}`,
    });
  }

  // Webhooks.
  for (const w of input.webhooks) {
    if (computeWebhookStatus(w.failure_count, w.last_success_at, w.last_failure_at) === "failing") {
      alerts.push({
        alert_type: "webhook_failure", severity: "critical", provider_id: w.provider_id,
        message: `${w.provider_id} webhook has ${w.failure_count} consecutive failures.`,
        recommended_action: `Check the ${w.provider_id} webhook secret and endpoint logs; replay missed events at the provider.`,
        dedupe_key: `webhook:${w.provider_id}:failing:${monthKey}`,
      });
    }
  }

  return alerts;
}
