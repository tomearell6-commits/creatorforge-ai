import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  calculateEmailQualityScore,
  verifySingleEmail,
  verifyBulkEmails,
  willUseNeverBounce,
} from "./neverbounce";

// Ensure NO real provider is configured so verifySingleEmail takes the pure,
// offline heuristic branch (no fetch, no network).
const PROVIDER_KEYS = ["NEVERBOUNCE_API_KEY", "ZEROBOUNCE_API_KEY"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of PROVIDER_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of PROVIDER_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("calculateEmailQualityScore", () => {
  it("scores valid highest and invalid/failed at 0", () => {
    expect(calculateEmailQualityScore("valid", "jane@acme.com")).toBe(95);
    expect(calculateEmailQualityScore("invalid", "x@y.com")).toBe(0);
    expect(calculateEmailQualityScore("failed", "x@y.com")).toBe(0);
  });

  it("scores catchall/unknown/disposable in descending order", () => {
    expect(calculateEmailQualityScore("catchall", "x@y.com")).toBe(70);
    expect(calculateEmailQualityScore("unknown", "x@y.com")).toBe(40);
    expect(calculateEmailQualityScore("disposable", "x@y.com")).toBe(10);
  });

  it("penalizes role-based valid addresses by 10", () => {
    expect(calculateEmailQualityScore("valid", "info@acme.com")).toBe(85);
    expect(calculateEmailQualityScore("valid", "sales@acme.com")).toBe(85);
  });

  it("does not penalize role prefix on non-valid results", () => {
    expect(calculateEmailQualityScore("catchall", "info@acme.com")).toBe(70);
  });

  it("clamps to the 0..100 range", () => {
    const s = calculateEmailQualityScore("valid", "admin@acme.com");
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe("willUseNeverBounce", () => {
  it("is false when no provider env is set", () => {
    expect(willUseNeverBounce()).toBe(false);
  });
  it("is true when NEVERBOUNCE_API_KEY is set", () => {
    process.env.NEVERBOUNCE_API_KEY = "nb_key";
    expect(willUseNeverBounce()).toBe(true);
  });
  it("is true when ZEROBOUNCE_API_KEY is set", () => {
    process.env.ZEROBOUNCE_API_KEY = "zb_key";
    expect(willUseNeverBounce()).toBe(true);
  });
});

describe("verifySingleEmail — heuristic branch (no provider)", () => {
  it("marks a malformed address invalid without hitting the network", async () => {
    const r = await verifySingleEmail("not-an-email");
    expect(r.result).toBe("invalid");
    expect(r.score).toBe(0);
  });

  it("marks a disposable domain as disposable", async () => {
    const r = await verifySingleEmail("throwaway@mailinator.com");
    expect(r.result).toBe("disposable");
    expect(r.provider).toBe("heuristic");
    expect(r.score).toBe(10);
  });

  it("marks example.com samples as catchall", async () => {
    const r = await verifySingleEmail("someone@example.com");
    expect(r.result).toBe("catchall");
    expect(r.provider).toBe("heuristic");
  });

  it("marks a normal address as valid", async () => {
    const r = await verifySingleEmail("jane.doe@acme.com");
    expect(r.result).toBe("valid");
    expect(r.provider).toBe("heuristic");
    expect(r.score).toBe(95);
  });

  it("normalizes case and whitespace", async () => {
    const r = await verifySingleEmail("  Jane@ACME.com  ");
    expect(r.email).toBe("jane@acme.com");
    expect(r.result).toBe("valid");
  });

  it("applies the role-address penalty in the heuristic path", async () => {
    const r = await verifySingleEmail("info@acme.com");
    expect(r.result).toBe("valid");
    expect(r.score).toBe(85);
  });
});

describe("verifyBulkEmails", () => {
  it("returns one result per input, in order", async () => {
    const out = await verifyBulkEmails([
      "jane@acme.com",
      "bad",
      "temp@yopmail.com",
    ]);
    expect(out.map((r) => r.result)).toEqual(["valid", "invalid", "disposable"]);
  });

  it("handles an empty batch", async () => {
    expect(await verifyBulkEmails([])).toEqual([]);
  });
});
