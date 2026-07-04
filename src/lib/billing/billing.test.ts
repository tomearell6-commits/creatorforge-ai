import { describe, it, expect } from "vitest";
import { PLANS, planCredits } from "@/lib/constants";
import { COMPARISON_ROWS, usageCategoryFor, CREDIT_WARN_LEVELS, EXPIRY_WARN_DAYS, BILLING_NAV } from "@/config/billing";
import { computeRecommendations, nextTier } from "./recommendations";
import { buildWarnings } from "./overview";
import type { WalletSummary } from "@/lib/credits/wallet";
import type { UsageReport } from "./usage";

function wallet(over: Partial<WalletSummary> = {}): WalletSummary {
  return {
    plan: "creator", planName: "Starter", monthlyAllowance: 500, monthlyRemaining: 400,
    bonusCredits: 0, purchasedCredits: 0, usedCredits: 100, creditsRemaining: 400,
    renewalDate: null, warnLevel: "ok", remainingFraction: 0.8, ...over,
  };
}

function usage(over: Partial<UsageReport> = {}): UsageReport {
  return { totalCredits90d: 100, byCategory: [], daily: [], weekly: [], monthly: [], ...over };
}

describe("plan catalog", () => {
  it("has the five tiers with stable ids", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["free", "creator", "pro", "agency", "enterprise"]);
    expect(PLANS.map((p) => p.name)).toEqual(["Free Trial", "Starter", "Professional", "Business", "Enterprise"]);
  });
  it("planCredits still resolves by id (webhooks depend on this)", () => {
    expect(planCredits("creator")).toBe(500);
    expect(planCredits("pro")).toBe(2000);
    expect(planCredits("agency")).toBe(8000);
    expect(planCredits("unknown")).toBe(0);
  });
  it("annual prices give two months free", () => {
    for (const p of PLANS.filter((x) => x.annualPrice != null)) {
      expect(p.annualPrice).toBe(p.price * 10);
    }
  });
  it("enterprise is custom and not purchasable", () => {
    const ent = PLANS.find((p) => p.id === "enterprise")!;
    expect(ent.custom).toBe(true);
    expect(ent.price).toBe(0); // crypto checkout rejects price <= 0
  });
});

describe("comparison matrix", () => {
  it("every row covers every plan id", () => {
    const ids = PLANS.map((p) => p.id);
    for (const row of COMPARISON_ROWS) {
      for (const id of ids) {
        expect(row.values[id], `${row.key} missing value for ${id}`).toBeDefined();
      }
    }
  });
  it("includes the spec's required feature rows", () => {
    const keys = COMPARISON_ROWS.map((r) => r.key);
    for (const k of ["ai_video", "ai_seo", "lead_gen", "design", "build", "real_estate", "api", "credits", "storage", "team", "support"]) {
      expect(keys).toContain(k);
    }
  });
});

describe("usage categorisation", () => {
  it("maps reason prefixes to buckets", () => {
    expect(usageCategoryFor("SEO_ARTICLE")).toBe("seo");
    expect(usageCategoryFor("EMAIL_DAILY_SUMMARY")).toBe("email");
    expect(usageCategoryFor("RENDER_HD")).toBe("ai_video");
    expect(usageCategoryFor("LEAD_SEARCH")).toBe("leads");
    expect(usageCategoryFor("BUILD_PACKAGE")).toBe("build");
    expect(usageCategoryFor("something-weird")).toBe("other");
    expect(usageCategoryFor("")).toBe("other");
  });
});

describe("warnings", () => {
  it("thresholds are configured per spec (30/15/5% and 30/14/7/3/1 days)", () => {
    expect(CREDIT_WARN_LEVELS.map((l) => l.fraction)).toEqual([0.05, 0.15, 0.3]);
    expect(EXPIRY_WARN_DAYS).toEqual([30, 14, 7, 3, 1]);
  });
  it("fires the credit warning below 30% with Top Up + Upgrade actions", () => {
    const w = buildWarnings(wallet({ creditsRemaining: 100, monthlyAllowance: 500 }), null);
    expect(w).toHaveLength(1);
    expect(w[0].actions.map((a) => a.label)).toEqual(["Top Up", "Upgrade"]);
    expect(w[0].severity).toBe("info");
  });
  it("escalates below 5% and at 0", () => {
    expect(buildWarnings(wallet({ creditsRemaining: 20 }), null)[0].severity).toBe("critical");
    expect(buildWarnings(wallet({ creditsRemaining: 0 }), null)[0].title).toContain("out of credits");
  });
  it("no credit warning above 30%", () => {
    expect(buildWarnings(wallet({ creditsRemaining: 400 }), null)).toHaveLength(0);
  });
  it("expiry warning fires within 30 days, escalating as it gets closer", () => {
    expect(buildWarnings(wallet(), 45).some((w) => w.title.includes("ends in"))).toBe(false);
    const at20 = buildWarnings(wallet(), 20).find((w) => w.title.includes("ends in"));
    expect(at20?.severity).toBe("info");
    const at7 = buildWarnings(wallet(), 7).find((w) => w.title.includes("7 day"));
    expect(at7?.severity).toBe("warning");
    const at2 = buildWarnings(wallet(), 2).find((w) => w.title.includes("2 day"));
    expect(at2?.severity).toBe("critical");
    expect(buildWarnings(wallet(), 0).some((w) => w.title.includes("today"))).toBe(true);
  });
});

describe("recommendations engine", () => {
  it("nextTier walks up the paid ladder and skips enterprise", () => {
    expect(nextTier("free")?.id).toBe("creator");
    expect(nextTier("creator")?.id).toBe("pro");
    expect(nextTier("agency")).toBeNull(); // enterprise is custom
  });
  it("fires the 90% rule with the next tier named", () => {
    const recs = computeRecommendations(wallet({ usedCredits: 460, monthlyAllowance: 500 }), usage());
    const r = recs.find((x) => x.recKey === "credits-90pct");
    expect(r).toBeDefined();
    expect(r!.severity).toBe("critical");
    expect(r!.body).toContain("Professional");
  });
  it("fires the dominant-category rule from real usage", () => {
    const recs = computeRecommendations(
      wallet(),
      usage({ totalCredits90d: 200, byCategory: [{ id: "ai_video", label: "AI Videos", credits: 150 }] })
    );
    expect(recs.some((r) => r.recKey === "dominant-ai_video")).toBe(true);
  });
  it("suggests upgrading active trial users", () => {
    const recs = computeRecommendations(wallet({ plan: "free", monthlyAllowance: 50 }), usage({ totalCredits90d: 30 }));
    expect(recs.some((r) => r.recKey === "trial-active-user")).toBe(true);
  });
  it("stays quiet for a light user", () => {
    expect(computeRecommendations(wallet({ usedCredits: 50 }), usage({ totalCredits90d: 10 }))).toHaveLength(0);
  });
});

describe("billing nav", () => {
  it("contains all 8 spec pages", () => {
    expect(BILLING_NAV.map((n) => n.href)).toEqual([
      "/dashboard/billing",
      "/dashboard/billing/plans",
      "/dashboard/billing/credits",
      "/dashboard/billing/usage",
      "/dashboard/billing/invoices",
      "/dashboard/billing/history",
      "/dashboard/billing/payment-methods",
      "/dashboard/billing/support",
    ]);
  });
});
