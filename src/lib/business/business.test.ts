import { describe, it, expect } from "vitest";
import { computeHealth, type HealthInputs } from "./health";
import { scoreProfile } from "./profile";
import { inquiryLooksSensitive } from "./ai";
import { AUTOPILOT_FORBIDDEN, BUSINESS_CREDIT_COSTS, DOCUMENT_TYPES, BUSINESS_NAV } from "@/config/businessOps";

function inputs(over: Partial<HealthInputs> = {}): HealthInputs {
  return {
    profileScore: 80, productsPublished: 3, knowledgeItems: 3, contentActions30d: 20,
    inquiriesOpen: 2, inquiriesOverdue: 0, avgReplyDrafts: 1, twoFactorEnabled: true,
    creditsRemaining: 400, monthlyAllowance: 500, planActive: true, automationConfigured: true,
    ...over,
  };
}

describe("business health score", () => {
  it("solid account scores B; excellent account scores A", () => {
    const solid = computeHealth(inputs());
    expect(solid.grade).toBe("B");
    const excellent = computeHealth(inputs({ profileScore: 100, productsPublished: 5, knowledgeItems: 5, contentActions30d: 40 }));
    expect(excellent.score).toBeGreaterThanOrEqual(80);
    expect(excellent.grade).toBe("A");
  });
  it("empty account scores low with actionable recommendations", () => {
    const r = computeHealth(inputs({
      profileScore: 0, productsPublished: 0, knowledgeItems: 0, contentActions30d: 0,
      twoFactorEnabled: false, automationConfigured: false, creditsRemaining: 0,
    }));
    expect(r.score).toBeLessThan(30);
    expect(r.recommendations.length).toBeGreaterThanOrEqual(5);
  });
  it("overdue inquiries drain the responsiveness factor", () => {
    const fresh = computeHealth(inputs());
    const overdue = computeHealth(inputs({ inquiriesOverdue: 5 }));
    expect(overdue.score).toBeLessThan(fresh.score);
    expect(overdue.factors.find((f) => f.id === "responsiveness")!.score).toBe(0);
  });
  it("missing 2FA costs 8 points", () => {
    const withTfa = computeHealth(inputs());
    const without = computeHealth(inputs({ twoFactorEnabled: false }));
    expect(withTfa.score - without.score).toBe(8);
  });
  it("score is always 0..100 and factors sum to it", () => {
    for (const over of [{}, { profileScore: 200 }, { contentActions30d: 9999 }]) {
      const r = computeHealth(inputs(over));
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.factors.reduce((s, f) => s + f.score, 0)).toBe(r.score);
    }
  });
});

describe("profile scoring", () => {
  it("empty profile scores 0 with every issue listed", () => {
    const r = scoreProfile({});
    expect(r.score).toBe(0);
    expect(r.issues.length).toBe(18);
  });
  it("short descriptions fill completeness but not the quality score", () => {
    const short = scoreProfile({ description: "We sell stuff." });
    expect(short.completeness).toBeGreaterThan(0);
    expect(short.issues.some((i) => i.field === "description")).toBe(true);
    const long = scoreProfile({ description: "We supply premium refrigeration equipment to restaurants across Australia, with same-week installation and a 5-year warranty on every unit we sell." });
    expect(long.issues.some((i) => i.field === "description")).toBe(false);
  });
  it("full profile scores 100", () => {
    const r = scoreProfile({
      company_name: "Acme", description: "A long description that easily exceeds the eighty character minimum required for quality scoring purposes.",
      industry: "Retail", products_summary: "Widgets", services_summary: "Support", target_market: "SMBs",
      business_hours: "9-5", website: "https://acme.com", social_links: { x: "https://x.com/acme" },
      contact_email: "hi@acme.com", contact_phone: "123", address: "1 Road", logo_url: "https://a/l.png",
      brand_colors: ["#84cc16"], brand_voice: "friendly", mission: "Serve", story: "Founded",
      certificates: [{ name: "ISO" }], awards: [{ name: "Best" }],
    });
    expect(r.score).toBe(100);
    expect(r.issues).toHaveLength(0);
  });
});

describe("inquiry safety", () => {
  it("flags sensitive keywords", () => {
    expect(inquiryLooksSensitive("I want a refund now")).toBe(true);
    expect(inquiryLooksSensitive("My lawyer will contact you")).toBe(true);
    expect(inquiryLooksSensitive("GDPR data deletion request")).toBe(true);
    expect(inquiryLooksSensitive("Can I get a quote for 100 units?")).toBe(false);
  });
});

describe("module config", () => {
  it("autopilot forbidden list covers the spec's high-risk actions", () => {
    const text = AUTOPILOT_FORBIDDEN.join(" ").toLowerCase();
    for (const word of ["pricing", "refund", "contract", "legal", "dispute", "billing", "delete", "send"]) {
      expect(text).toContain(word);
    }
  });
  it("credit costs are positive and document types include the numbered trio", () => {
    for (const v of Object.values(BUSINESS_CREDIT_COSTS)) expect(v).toBeGreaterThan(0);
    for (const id of ["quotation", "invoice", "purchase_order"]) {
      expect(DOCUMENT_TYPES.find((d) => d.id === id)?.numbered).toBe(true);
    }
  });
  it("sub-nav covers the 10 module pages", () => {
    expect(BUSINESS_NAV).toHaveLength(10);
    expect(BUSINESS_NAV.every((n) => n.href.startsWith("/dashboard/business"))).toBe(true);
  });
});
