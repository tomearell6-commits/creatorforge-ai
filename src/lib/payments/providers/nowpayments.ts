/**
 * NOWPayments implementation of the CryptoProvider interface. Reuses the proven
 * invoice creation + HMAC-SHA512 IPN verification from lib/payments/crypto.ts
 * and normalises the IPN payload into a WebhookResult.
 */
import { createCryptoInvoice, verifyCryptoWebhook } from "@/lib/payments/crypto";
import type { CryptoProvider, CreatePaymentInput, CreatePaymentResult, WebhookResult } from "./types";

function mapStatus(s: string): WebhookResult["status"] {
  switch (s) {
    case "waiting": return "waiting";
    case "confirming":
    case "sending":
    case "partially_paid": return "confirming";
    case "confirmed": return "confirmed";
    case "finished": return "finished";
    case "expired": return "expired";
    case "failed":
    case "refunded": return "failed";
    default: return "unknown";
  }
}

export const nowPaymentsProvider: CryptoProvider = {
  id: "nowpayments",

  isConfigured() {
    return !!process.env.NOWPAYMENTS_API_KEY;
  },

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const { url } = await createCryptoInvoice({
      amount: input.amountUsd,
      orderId: input.orderReference,
      description: input.description,
      ipnCallbackUrl: input.ipnCallbackUrl,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });
    return { invoiceUrl: url };
  },

  verifyAndParseWebhook(rawBody: string, signature: string | null): WebhookResult {
    const valid = verifyCryptoWebhook(rawBody, signature);
    if (!valid) return { valid: false, status: "unknown", settled: false };

    let d: Record<string, unknown> = {};
    try { d = JSON.parse(rawBody); } catch { /* ignore */ }

    const status = mapStatus(String(d.payment_status ?? ""));
    return {
      valid: true,
      status,
      settled: status === "finished" || status === "confirmed",
      orderReference: d.order_id ? String(d.order_id) : undefined,
      providerPaymentId: String(d.payment_id ?? d.invoice_id ?? "") || undefined,
      txHash: d.payin_hash ? String(d.payin_hash) : undefined,
      confirmations: d.confirmations != null ? Number(d.confirmations) : undefined,
      currency: d.pay_currency ? String(d.pay_currency).toUpperCase() : undefined,
      amountCrypto: d.pay_amount != null ? Number(d.pay_amount) : undefined,
    };
  },
};
