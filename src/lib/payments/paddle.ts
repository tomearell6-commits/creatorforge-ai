/**
 * Paddle Billing integration helpers (Track D).
 *
 * - `priceToPlan` maps a Paddle Price ID (from env) to a CreatorForge plan id.
 * - `verifyPaddleWebhook` validates the `Paddle-Signature` header: HMAC-SHA256
 *   of `${ts}:${rawBody}` keyed by the endpoint secret, timing-safe compared to
 *   `h1`, with a freshness window to deter replay.
 *
 * Checkout itself is client-side via Paddle.js (see components/dashboard/PaddleCheckout).
 */

import crypto from "crypto";

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_CREATOR ?? "_creator"]: "creator",
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? "_pro"]: "pro",
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_AGENCY ?? "_agency"]: "agency",
};

export function priceToPlan(priceId?: string | null): string | null {
  if (!priceId) return null;
  return PRICE_TO_PLAN[priceId] ?? null;
}

const MAX_AGE_SECONDS = 300; // 5-minute replay window

export function verifyPaddleWebhook(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  // Header looks like: ts=1671552777;h1=<hex>
  const parts: Record<string, string> = {};
  for (const kv of signatureHeader.split(";")) {
    const [k, v] = kv.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return false;

  const computed = crypto.createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(h1, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
