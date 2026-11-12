/**
 * Recognise "the AI provider account is out of credit / over its limit" and check it cheaply.
 *
 * This is a problem on OUR side (the platform's Anthropic or OpenAI account), never the customer's. It must not
 * count as a failure of the customer's site: Autopilot waits, retries every hour, and carries on by itself once the
 * account is topped up. Nothing is charged to the customer while it waits.
 */
import Anthropic from "@anthropic-ai/sdk";

const BILLING_PATTERNS =
  /credit balance is too low|plans\s*&\s*billing|insufficient[_ ]quota|exceeded your current quota|billing[_ ]hard[_ ]limit|billing_not_active|payment required|"status":\s*402/i;

export function isProviderBillingError(e: unknown): boolean {
  const text = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  const status = (e as { status?: number } | null)?.status;
  return status === 402 || BILLING_PATTERNS.test(text);
}

/** Shown to the customer. Plain, calm, and says nothing about our provider accounts. */
export const PROVIDER_WAIT_MESSAGE =
  "The AI writing service is temporarily unavailable on our side. Autopilot is waiting and tries again every hour, " +
  "so it carries on by itself as soon as it is back. Nothing has been charged.";

/**
 * One-token question to the writing model. Costs a fraction of a cent. Returns false only when the account is out of
 * credit; any other problem (network blip, model name change) returns true so the normal run decides what to do.
 */
export async function writingServiceAvailable(): Promise<boolean> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return true;
  try {
    await new Anthropic({ apiKey, maxRetries: 0, timeout: 15_000 }).messages.create({
      model: process.env.AI_PROBE_MODEL || "claude-haiku-4-5",
      max_tokens: 1,
      messages: [{ role: "user", content: "ok" }],
    });
    return true;
  } catch (e) {
    return !isProviderBillingError(e);
  }
}
