import { describe, it, expect } from "vitest";
import {
  estimateForAction,
  canAfford,
  estimatedProjectsRemaining,
} from "./estimator";
import { ACTION_CREDIT_ESTIMATES } from "@/lib/constants";

describe("estimateForAction", () => {
  it("returns the matching estimate for a known action id", () => {
    const e = estimateForAction("script");
    expect(e).not.toBeNull();
    expect(e!.id).toBe("script");
    // Mirrors the exported constant (source of truth for real charges).
    const expected = ACTION_CREDIT_ESTIMATES.find((a) => a.id === "script")!;
    expect(e!.credits).toBe(expected.credits);
  });

  it("returns null for an unknown action id", () => {
    expect(estimateForAction("does-not-exist")).toBeNull();
  });

  it("resolves every id present in the estimate table", () => {
    for (const a of ACTION_CREDIT_ESTIMATES) {
      expect(estimateForAction(a.id)).toEqual(a);
    }
  });
});

describe("canAfford", () => {
  it("is affordable when remaining exceeds required", () => {
    const r = canAfford(10, 25);
    expect(r).toEqual({ required: 10, remaining: 25, affordable: true, shortfall: 0 });
  });

  it("is affordable at the exact boundary (remaining === required)", () => {
    const r = canAfford(30, 30);
    expect(r.affordable).toBe(true);
    expect(r.shortfall).toBe(0);
  });

  it("is not affordable and reports the shortfall when short", () => {
    const r = canAfford(50, 20);
    expect(r.affordable).toBe(false);
    expect(r.shortfall).toBe(30);
  });

  it("treats zero required as always affordable", () => {
    expect(canAfford(0, 0).affordable).toBe(true);
    expect(canAfford(0, 0).shortfall).toBe(0);
  });
});

describe("estimatedProjectsRemaining", () => {
  it("floors remaining / avg cost", () => {
    expect(estimatedProjectsRemaining(275, 90)).toBe(3); // 275/90 = 3.05 -> 3
  });

  it("uses the default average per project (90) when omitted", () => {
    expect(estimatedProjectsRemaining(180)).toBe(2);
  });

  it("returns 0 when remaining is below one project's cost", () => {
    expect(estimatedProjectsRemaining(50, 90)).toBe(0);
  });

  it("returns 0 for a non-positive average to avoid divide-by-zero", () => {
    expect(estimatedProjectsRemaining(100, 0)).toBe(0);
    expect(estimatedProjectsRemaining(100, -5)).toBe(0);
  });
});
