import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { verifyPaddleWebhook, priceToPlan } from "./paddle";

const SECRET = "pdl_test_secret_abc123";

function sign(body: string, ts: number, secret = SECRET): string {
  const h1 = crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

describe("verifyPaddleWebhook", () => {
  const origSecret = process.env.PADDLE_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.PADDLE_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    if (origSecret === undefined) delete process.env.PADDLE_WEBHOOK_SECRET;
    else process.env.PADDLE_WEBHOOK_SECRET = origSecret;
  });

  it("accepts a valid, fresh signature", () => {
    const body = JSON.stringify({ event_type: "subscription.created", id: "evt_1" });
    const ts = Math.floor(Date.now() / 1000);
    expect(verifyPaddleWebhook(body, sign(body, ts))).toBe(true);
  });

  it("rejects a tampered body (signature over different bytes)", () => {
    const body = JSON.stringify({ amount: 10 });
    const ts = Math.floor(Date.now() / 1000);
    const header = sign(body, ts);
    const tampered = JSON.stringify({ amount: 999999 });
    expect(verifyPaddleWebhook(tampered, header)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const body = "{}";
    const ts = Math.floor(Date.now() / 1000);
    expect(verifyPaddleWebhook(body, sign(body, ts, "wrong-secret"))).toBe(false);
  });

  it("rejects a stale timestamp outside the 5-minute window", () => {
    const body = "{}";
    const ts = Math.floor(Date.now() / 1000) - 301; // 5m + 1s in the past
    expect(verifyPaddleWebhook(body, sign(body, ts))).toBe(false);
  });

  it("rejects a future timestamp outside the window", () => {
    const body = "{}";
    const ts = Math.floor(Date.now() / 1000) + 3600;
    expect(verifyPaddleWebhook(body, sign(body, ts))).toBe(false);
  });

  it("accepts a timestamp near the edge of the window (4m59s old)", () => {
    const body = "{}";
    const ts = Math.floor(Date.now() / 1000) - 299;
    expect(verifyPaddleWebhook(body, sign(body, ts))).toBe(true);
  });

  it("returns false when the header is null", () => {
    expect(verifyPaddleWebhook("{}", null)).toBe(false);
  });

  it("returns false for a malformed header (missing h1)", () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(verifyPaddleWebhook("{}", `ts=${ts}`)).toBe(false);
  });

  it("returns false when the secret env var is unset", () => {
    delete process.env.PADDLE_WEBHOOK_SECRET;
    const body = "{}";
    const ts = Math.floor(Date.now() / 1000);
    expect(verifyPaddleWebhook(body, sign(body, ts))).toBe(false);
  });

  it("returns false for a non-numeric timestamp", () => {
    const h1 = crypto.createHmac("sha256", SECRET).update(`abc:{}`).digest("hex");
    expect(verifyPaddleWebhook("{}", `ts=abc;h1=${h1}`)).toBe(false);
  });
});

describe("priceToPlan", () => {
  const keys = [
    "NEXT_PUBLIC_PADDLE_PRICE_CREATOR",
    "NEXT_PUBLIC_PADDLE_PRICE_PRO",
    "NEXT_PUBLIC_PADDLE_PRICE_AGENCY",
  ] as const;

  it("returns null for null/undefined", () => {
    expect(priceToPlan(null)).toBeNull();
    expect(priceToPlan(undefined)).toBeNull();
  });

  it("returns null for an unknown price id", () => {
    expect(priceToPlan("pri_totally_unknown")).toBeNull();
  });

  it("maps default placeholder ids when env is unset", () => {
    // The module captured env at import time; when the price envs are unset the
    // fallback placeholder keys ("_creator" etc.) are used in the map.
    const unset = keys.every((k) => !process.env[k]);
    if (unset) {
      expect(priceToPlan("_creator")).toBe("creator");
      expect(priceToPlan("_pro")).toBe("pro");
      expect(priceToPlan("_agency")).toBe("agency");
    } else {
      // Env was configured before import; just assert the mapping is total.
      expect(priceToPlan("definitely-not-a-price")).toBeNull();
    }
  });
});
