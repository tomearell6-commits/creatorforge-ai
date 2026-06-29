/**
 * Crypto provider registry. Select with CRYPTO_PROVIDER (default: nowpayments).
 * Add a gateway by implementing CryptoProvider and registering it here.
 */
import type { CryptoProvider } from "./types";
import { nowPaymentsProvider } from "./nowpayments";

const PROVIDERS: Record<string, CryptoProvider> = {
  nowpayments: nowPaymentsProvider,
};

export function getCryptoProvider(): CryptoProvider {
  const id = (process.env.CRYPTO_PROVIDER || "nowpayments").toLowerCase();
  return PROVIDERS[id] ?? nowPaymentsProvider;
}

export type { CryptoProvider } from "./types";
