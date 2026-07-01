import { describe, it, expect } from "vitest";
import {
  firstBlock,
  LEAD_PLAN_ACCESS,
  COMPLIANCE_POLICY_VERSION,
  type LeadAccess,
} from "./access";

/** Build a LeadAccess from a plan's code defaults, fully "unblocked" for send. */
function accessFor(plan: keyof typeof LEAD_PLAN_ACCESS, overrides: Partial<LeadAccess> = {}): LeadAccess {
  const def = LEAD_PLAN_ACCESS[plan];
  return {
    plan,
    level: def.level,
    verified: true,
    paid: plan !== "free",
    featureEnabled: true,
    complianceAccepted: true,
    senderProfileComplete: true,
    limits: { ...def },
    usage: { leadsThisMonth: 0, sendsToday: 0 },
    ...overrides,
  };
}

describe("LEAD_PLAN_ACCESS table", () => {
  it("free has no access", () => {
    expect(LEAD_PLAN_ACCESS.free.level).toBe("none");
    expect(LEAD_PLAN_ACCESS.free.automatedSend).toBe(false);
  });
  it("creator is limited (search only, no send)", () => {
    expect(LEAD_PLAN_ACCESS.creator.level).toBe("limited");
    expect(LEAD_PLAN_ACCESS.creator.automatedSend).toBe(false);
  });
  it("pro & agency allow automated send", () => {
    expect(LEAD_PLAN_ACCESS.pro.automatedSend).toBe(true);
    expect(LEAD_PLAN_ACCESS.agency.automatedSend).toBe(true);
  });
});

describe("firstBlock — account gating", () => {
  it("blocks an unverified account for any need", () => {
    const a = accessFor("pro", { verified: false });
    expect(firstBlock(a, "view")?.action).toBe("verify_account");
    expect(firstBlock(a, "search")?.action).toBe("verify_account");
    expect(firstBlock(a, "send")?.action).toBe("verify_account");
  });

  it("blocks a suspended/disabled account (contact_support)", () => {
    const a = accessFor("pro", { featureEnabled: false });
    expect(firstBlock(a, "view")?.reason).toBe("suspended");
    expect(firstBlock(a, "view")?.action).toBe("contact_support");
  });
});

describe("firstBlock — free / no-access plan", () => {
  it("blocks free plan on every need with upgrade_plan", () => {
    const a = accessFor("free");
    expect(firstBlock(a, "view")?.action).toBe("upgrade_plan");
    expect(firstBlock(a, "search")?.reason).toBe("plan_no_access");
    expect(firstBlock(a, "send")?.reason).toBe("plan_no_access");
  });
});

describe("firstBlock — view", () => {
  it("allows view for a paid plan with access", () => {
    expect(firstBlock(accessFor("creator"), "view")).toBeNull();
    expect(firstBlock(accessFor("pro"), "view")).toBeNull();
  });
});

describe("firstBlock — search", () => {
  it("allows search for creator (limited) plan", () => {
    expect(firstBlock(accessFor("creator"), "search")).toBeNull();
  });

  it("allows search for pro plan under the monthly limit", () => {
    const a = accessFor("pro", { usage: { leadsThisMonth: 10, sendsToday: 0 } });
    expect(firstBlock(a, "search")).toBeNull();
  });

  it("blocks search when the monthly lead limit is reached", () => {
    const a = accessFor("creator", {
      usage: { leadsThisMonth: LEAD_PLAN_ACCESS.creator.monthlyLeads, sendsToday: 0 },
    });
    const b = firstBlock(a, "search");
    expect(b?.reason).toBe("monthly_limit");
    expect(b?.message).toContain(String(LEAD_PLAN_ACCESS.creator.monthlyLeads));
  });
});

describe("firstBlock — send", () => {
  it("blocks send on the limited (creator) plan", () => {
    const b = firstBlock(accessFor("creator"), "send");
    expect(b?.reason).toBe("send_not_in_plan");
    expect(b?.action).toBe("upgrade_plan");
  });

  it("allows send on a fully-configured pro plan", () => {
    expect(firstBlock(accessFor("pro"), "send")).toBeNull();
  });

  it("allows send on a fully-configured agency plan", () => {
    expect(firstBlock(accessFor("agency"), "send")).toBeNull();
  });

  it("blocks send when compliance not accepted", () => {
    const a = accessFor("pro", { complianceAccepted: false });
    expect(firstBlock(a, "send")?.action).toBe("accept_compliance");
  });

  it("blocks send when sender profile incomplete", () => {
    const a = accessFor("pro", { senderProfileComplete: false });
    expect(firstBlock(a, "send")?.action).toBe("complete_sender_profile");
  });

  it("blocks send when the daily send limit is reached", () => {
    const a = accessFor("pro", {
      usage: { leadsThisMonth: 0, sendsToday: LEAD_PLAN_ACCESS.pro.dailySends },
    });
    const b = firstBlock(a, "send");
    expect(b?.reason).toBe("daily_send_limit");
    expect(b?.message).toContain(String(LEAD_PLAN_ACCESS.pro.dailySends));
  });

  it("prioritizes plan gate over compliance/profile (order matters)", () => {
    // creator lacks automatedSend AND compliance/profile — plan block wins.
    const a = accessFor("creator", { complianceAccepted: false, senderProfileComplete: false });
    expect(firstBlock(a, "send")?.reason).toBe("send_not_in_plan");
  });
});

describe("COMPLIANCE_POLICY_VERSION", () => {
  it("is a non-empty date-like string", () => {
    expect(COMPLIANCE_POLICY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
