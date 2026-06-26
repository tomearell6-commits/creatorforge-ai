/**
 * Crypto payment integration — NOWPayments (Track D).
 *
 * - `createCryptoInvoice` creates a hosted invoice; the user is redirected to
 *   `invoice_url` to pay in their chosen coin.
 * - `verifyCryptoWebhook` validates the IPN callback: HMAC-SHA512 of the
 *   key-sorted JSON body (NOWPayments' documented scheme), keyed by the IPN
 *   secret, timing-safe compared to the `x-nowpayments-sig` header.
 */

import crypto from "crypto";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

type CreateInvoiceInput = {
  amount: number;
  orderId: string;
  description: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createCryptoInvoice(input: CreateInvoiceInput): Promise<{ url: string }> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) throw new Error("NOWPAYMENTS_API_KEY is not set");

  const res = await fetch(`${NOWPAYMENTS_API}/invoice`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: input.amount,
      price_currency: "usd",
      order_id: input.orderId,
      order_description: input.description,
      ipn_callback_url: input.ipnCallbackUrl,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    }),
  });
  if (!res.ok) throw new Error(`NOWPayments invoice error ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as { invoice_url?: string };
  if (!json.invoice_url) throw new Error("NOWPayments returned no invoice_url");
  return { url: json.invoice_url };
}

// Recursively sort object keys (matches NOWPayments' signing transform exactly).
function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj)
    .sort()
    .reduce((result: Record<string, unknown>, key) => {
      const val = obj[key];
      result[key] =
        val && typeof val === "object" ? sortObject(val as Record<string, unknown>) : val;
      return result;
    }, {});
}

export function verifyCryptoWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !signature) return false;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const sorted = JSON.stringify(sortObject(parsed));
  const computed = crypto.createHmac("sha512", secret).update(sorted).digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
