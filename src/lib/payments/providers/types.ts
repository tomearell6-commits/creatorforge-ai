/**
 * Modular crypto payment provider interface.
 *
 * The wallet top-up flow depends only on this interface, never on a concrete
 * gateway. Swap providers by registering another implementation in `index.ts`
 * and setting CRYPTO_PROVIDER. Architecture-first: a provider must be able to
 * (1) create a payment request for a USD amount and (2) verify + interpret an
 * inbound webhook so credits are issued exactly once.
 */

export type CreatePaymentInput = {
  /** Amount due, in USD. */
  amountUsd: number;
  /** Opaque order reference we control, echoed back by the webhook. */
  orderReference: string;
  description: string;
  /** Optional coin preselected by the user; provider may ignore. */
  currency?: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreatePaymentResult = {
  /** Hosted checkout / payment page to send the user to (if any). */
  invoiceUrl?: string;
  /** Direct on-chain address or payment request (if the provider exposes one). */
  payAddress?: string;
  /** Amount in the crypto unit, if known at creation time. */
  amountCrypto?: number;
  /** Provider-side id for correlation. */
  providerId?: string;
};

/** Normalised webhook result the wallet layer acts on. */
export type WebhookResult = {
  valid: boolean;
  /** Maps to crypto_payment_requests.status semantics. */
  status: "waiting" | "confirming" | "confirmed" | "finished" | "expired" | "failed" | "unknown";
  orderReference?: string;
  providerPaymentId?: string;
  txHash?: string;
  confirmations?: number;
  currency?: string;
  amountCrypto?: number;
  /** True only when funds are fully settled and credits should be issued. */
  settled: boolean;
};

export interface CryptoProvider {
  readonly id: string;
  /** Whether the provider has the env config it needs to operate. */
  isConfigured(): boolean;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyAndParseWebhook(rawBody: string, signature: string | null): WebhookResult;
}
