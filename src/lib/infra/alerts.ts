/**
 * Threshold-driven alert evaluation. Pure functions: given provider snapshots and
 * the admin thresholds, derive the alerts that *should* exist right now. The
 * /api/admin/infra routes compute these on the fly and merge with any manually
 * recorded provider_alerts rows.
 */
import type { ProviderSnapshot } from "./status";

export type Thresholds = {
  warning_threshold: number;       // % usage for a warning
  critical_threshold: number;      // % usage for critical
  renewal_reminder_days: number;   // days before renewal to remind
  storage_alert_pct: number;       // % storage used to alert
  api_quota_alert_pct: number;     // % API quota used to alert
  credit_alert_pct: number;        // % credits remaining to alert (low)
  daily_spend_alert: number;       // USD
  monthly_spend_alert: number;     // USD
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  warning_threshold: 80, critical_threshold: 95, renewal_reminder_days: 14,
  storage_alert_pct: 90, api_quota_alert_pct: 80, credit_alert_pct: 20,
  daily_spend_alert: 50, monthly_spend_alert: 1000,
};

export type Severity = "info" | "warning" | "critical";
export type DerivedAlert = {
  provider_id: string;
  severity: Severity;
  title: string;
  description: string;
  recommended_action: string;
};

export function evaluateAlerts(snaps: ProviderSnapshot[], t: Thresholds): DerivedAlert[] {
  const out: DerivedAlert[] = [];
  const now = Date.now();

  for (const s of snaps) {
    const name = s.def.name;

    // Offline / configured-but-unhealthy.
    if (s.configured && (s.status === "offline" || s.status === "critical")) {
      out.push({ provider_id: s.def.id, severity: "critical", title: `${name} ${s.status}`,
        description: `${name} reported a ${s.status} health status.`,
        recommended_action: `Check ${name} dashboard and recent error logs.` });
    }

    // Quota usage.
    if (s.usage?.quota_limit && s.usage.quota_used != null) {
      const pct = (s.usage.quota_used / s.usage.quota_limit) * 100;
      if (pct >= t.critical_threshold) out.push({ provider_id: s.def.id, severity: "critical", title: `${name} quota ${Math.round(pct)}%`, description: `${name} is at ${Math.round(pct)}% of its quota.`, recommended_action: "Upgrade the plan or throttle usage immediately." });
      else if (pct >= t.api_quota_alert_pct) out.push({ provider_id: s.def.id, severity: "warning", title: `${name} quota ${Math.round(pct)}%`, description: `${name} usage is above ${t.api_quota_alert_pct}%.`, recommended_action: "Review usage trend; plan an upgrade." });
    }

    // Low balance / credits.
    if (s.balance?.low) {
      out.push({ provider_id: s.def.id, severity: "warning", title: `${name} balance low`,
        description: `${name} balance is ${s.balance.amount ?? "?"} ${s.balance.currency ?? ""}.`,
        recommended_action: "Top up the provider account to avoid interruptions." });
    }

    // Renewal approaching.
    if (s.renewal?.renewal_date) {
      const days = Math.ceil((new Date(s.renewal.renewal_date).getTime() - now) / 86_400_000);
      if (days <= 7 && days >= -1) out.push({ provider_id: s.def.id, severity: "critical", title: `${name} renews in ${days}d`, description: `${name} renewal is ${days} day(s) away.`, recommended_action: "Confirm payment method and renew." });
      else if (days <= t.renewal_reminder_days) out.push({ provider_id: s.def.id, severity: "warning", title: `${name} renews in ${days}d`, description: `${name} renewal is within ${t.renewal_reminder_days} days.`, recommended_action: "Schedule renewal review." });
    }

    // Spend.
    if (s.cost?.daily_usd != null && s.cost.daily_usd >= t.daily_spend_alert) {
      out.push({ provider_id: s.def.id, severity: "warning", title: `${name} daily spend high`, description: `${name} daily cost is $${s.cost.daily_usd}.`, recommended_action: "Investigate the spend spike." });
    }

    // Config gap: payment provider live but webhook secret missing.
    if (s.def.id === "nowpayments" && s.configured && !process.env.NOWPAYMENTS_IPN_SECRET) {
      out.push({ provider_id: s.def.id, severity: "warning", title: "NOWPayments IPN secret missing", description: "Crypto webhook signature can't be verified without the IPN secret.", recommended_action: "Set NOWPAYMENTS_IPN_SECRET in the environment." });
    }
  }
  return out;
}
