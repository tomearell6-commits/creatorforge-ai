/**
 * Flutterwave payments (card + mobile money) — SERVER-ONLY helpers.
 *
 * Fully independent of the crypto and Paddle flows. Uses Flutterwave's Standard
 * hosted-checkout: we create a payment server-side (secret key) and redirect the
 * user to the returned link; Flutterwave then calls our webhook and redirects
 * back. Credits/plans are granted ONLY after a server-side transaction verify.
 *
 * Dormant until configured: without FLUTTERWAVE_SECRET_KEY the checkout route
 * runs in preview mode (no charge), exactly like the crypto provider.
 *
 * Env:
 *   FLUTTERWAVE_SECRET_KEY         (FLWSECK-...)   — required to go live
 *   NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY (FLWPUBK-.) — optional (inline JS)
 *   FLUTTERWAVE_WEBHOOK_HASH       — the "secret hash" set in the FLW dashboard
 */
import crypto from "crypto";
import { fetchWithTimeout } from "@/lib/http";

const API = "https://api.flutterwave.com/v3";

export function isFlutterwaveConfigured(): boolean {
  return !!process.env.FLUTTERWAVE_SECRET_KEY;
}

function secretKey(): string {
  return process.env.FLUTTERWAVE_SECRET_KEY || "";
}

export type CreateFlwPaymentInput = {
  txRef: string;
  amount: number;
  currency: string; // e.g. "USD"
  redirectUrl: string;
  customerEmail: string;
  customerName?: string;
  title: string;
  description: string;
  meta?: Record<string, unknown>;
};

/** Create a hosted-checkout payment. Returns the payment link to redirect to. */
export async function createFlutterwavePayment(input: CreateFlwPaymentInput): Promise<{ link: string }> {
  const res = await fetchWithTimeout(
    `${API}/payments`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: input.txRef,
        amount: input.amount,
        currency: input.currency,
        redirect_url: input.redirectUrl,
        customer: { email: input.customerEmail, name: input.customerName || undefined },
        customizations: { title: input.title, description: input.description },
        meta: input.meta ?? {},
      }),
    },
    20_000
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.status !== "success" || !json?.data?.link) {
    throw new Error(`Flutterwave create payment failed (${res.status}): ${JSON.stringify(json).slice(0, 200)}`);
  }
  return { link: json.data.link as string };
}

export type VerifiedTransaction = {
  successful: boolean;
  amount: number;
  currency: string;
  txRef: string;
  flwRef: string;
  flwTxId: string;
};

/** Server-side verify a transaction by its Flutterwave id. Never trust the
 *  webhook payload alone for granting value — always verify here. */
export async function verifyFlutterwaveTransaction(transactionId: string | number): Promise<VerifiedTransaction> {
  const res = await fetchWithTimeout(
    `${API}/transactions/${transactionId}/verify`,
    { headers: { Authorization: `Bearer ${secretKey()}` } },
    15_000
  );
  const json = await res.json().catch(() => ({}));
  const d = json?.data ?? {};
  return {
    successful: json?.status === "success" && d?.status === "successful",
    amount: Number(d?.amount ?? 0),
    currency: String(d?.currency ?? ""),
    txRef: String(d?.tx_ref ?? ""),
    flwRef: String(d?.flw_ref ?? ""),
    flwTxId: String(d?.id ?? transactionId),
  };
}

/** Verify the inbound webhook's `verif-hash` header against our configured
 *  secret hash (constant-time). Flutterwave signs webhooks with this shared
 *  secret you set in Dashboard → Settings → Webhooks. */
export function verifyFlutterwaveWebhook(signatureHeader: string | null): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secret || !signatureHeader) return false;
  const a = Buffer.from(signatureHeader, "utf8");
  const b = Buffer.from(secret, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
