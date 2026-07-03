import { describe, it, expect } from "vitest";
import {
  maskKey, computeKeyStatus, computeSubscriptionStatus, computeBalanceStatus,
  estimateDaysRemaining, computeQuotaStatus, computeWebhookStatus, evaluateOpsAlerts,
} from "./status";
import { OPS_PROVIDERS, MONTHLY_CHECKLIST_ITEMS } from "./registry";

const NOW = new Date("2026-07-03T12:00:00Z");
const daysFromNow = (n: number) => { const d = new Date(NOW); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

describe("maskKey — never reveals secrets", () => {
  it("shows only first 3 + last 4", () => {
    expect(maskKey("sk-ant-abcdefghijklmnop1234")).toBe("sk-****1234");
    expect(maskKey("short")).toBe("****");
    expect(maskKey("")).toBe("****");
  });
});

describe("key rotation status", () => {
  it("healthy → rotate_soon (≤14d) → overdue", () => {
    expect(computeKeyStatus(daysFromNow(-30), 90, NOW).status).toBe("healthy");
    expect(computeKeyStatus(daysFromNow(-80), 90, NOW).status).toBe("rotate_soon");
    expect(computeKeyStatus(daysFromNow(-100), 90, NOW).status).toBe("overdue");
    expect(computeKeyStatus(null, 90, NOW).status).toBe("unknown");
  });
});

describe("subscription status buckets", () => {
  it("maps days-remaining to statuses and severities", () => {
    expect(computeSubscriptionStatus(daysFromNow(60), NOW).status).toBe("active");
    expect(computeSubscriptionStatus(daysFromNow(20), NOW)).toMatchObject({ status: "renew_soon", severity: "info" });
    expect(computeSubscriptionStatus(daysFromNow(10), NOW)).toMatchObject({ status: "renew_soon", severity: "warning" });
    expect(computeSubscriptionStatus(daysFromNow(2), NOW)).toMatchObject({ status: "renewal_due", severity: "critical" });
    expect(computeSubscriptionStatus(daysFromNow(-1), NOW)).toMatchObject({ status: "expired", severity: "critical" });
  });
});

describe("credit balance status", () => {
  it("thresholds at warning/critical/exhausted", () => {
    expect(computeBalanceStatus(80, 100).status).toBe("healthy");
    expect(computeBalanceStatus(25, 100).status).toBe("warning");
    expect(computeBalanceStatus(8, 100).status).toBe("critical");
    expect(computeBalanceStatus(0, 100).status).toBe("exhausted");
    expect(computeBalanceStatus(null, 100).status).toBe("unknown");
  });
  it("estimates runway from daily burn", () => {
    expect(estimateDaysRemaining(100, 10)).toBe(10);
    expect(estimateDaysRemaining(100, 0)).toBeNull();
  });
});

describe("quota status", () => {
  it("70/85/95/100 buckets", () => {
    expect(computeQuotaStatus(50, 100).status).toBe("healthy");
    expect(computeQuotaStatus(75, 100).status).toBe("warning");
    expect(computeQuotaStatus(90, 100).status).toBe("critical");
    expect(computeQuotaStatus(101, 100).status).toBe("exceeded");
    expect(computeQuotaStatus(50, null).status).toBe("unknown");
  });
});

describe("webhook status", () => {
  it("failing only after 3+ failures newer than last success", () => {
    expect(computeWebhookStatus(0, null, null)).toBe("unknown");
    expect(computeWebhookStatus(5, "2026-07-01", "2026-07-02")).toBe("failing");
    expect(computeWebhookStatus(2, "2026-07-01", "2026-07-02")).toBe("healthy");
    expect(computeWebhookStatus(5, "2026-07-02", "2026-07-01")).toBe("healthy");
  });
});

describe("alert evaluation", () => {
  it("emits deduped alerts with recommended actions for every rule family", () => {
    const alerts = evaluateOpsAlerts({
      providers: [{ provider_id: "elevenlabs", name: "ElevenLabs", renewal_date: daysFromNow(7), monthly_cost: 22 }],
      keys: [{ provider_id: "openai", key_name: "OPENAI_API_KEY", last_rotated_at: daysFromNow(-120), rotation_days: 90 }],
      balances: [{ provider_id: "fal", current_balance: 5, full_balance: 100, warning_pct: 30, critical_pct: 10, daily_avg_usage: 1 }],
      quotas: [{ provider_id: "brevo", quota_type: "emails", current_usage: 96, monthly_limit: 100 }],
      webhooks: [{ provider_id: "paddle", failure_count: 4, last_success_at: null, last_failure_at: "2026-07-02" }],
    }, NOW);

    const types = alerts.map((a) => a.alert_type).sort();
    expect(types).toEqual(["key_rotation", "low_credits", "quota", "renewal", "webhook_failure"]);
    for (const a of alerts) {
      expect(a.recommended_action.length).toBeGreaterThan(5);
      expect(a.dedupe_key).toContain(a.provider_id);
    }
    // 7-day renewal is critical per the alert rules.
    expect(alerts.find((a) => a.alert_type === "renewal")?.severity).toBe("critical");
  });
});

describe("registry integrity", () => {
  it("provider ids are unique and categories valid", () => {
    const ids = OPS_PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(OPS_PROVIDERS.length).toBeGreaterThanOrEqual(28);
    expect(MONTHLY_CHECKLIST_ITEMS.length).toBe(13);
  });
});
