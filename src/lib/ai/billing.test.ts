import { describe, expect, it } from "vitest";
import { isProviderBillingError, PROVIDER_WAIT_MESSAGE } from "./billing";

describe("isProviderBillingError", () => {
  it("recognises the Anthropic out-of-credit error exactly as the logs showed it", () => {
    const m = `400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."},"request_id":"req_x"}`;
    expect(isProviderBillingError(new Error(m))).toBe(true);
  });
  it("recognises OpenAI quota errors and HTTP 402", () => {
    expect(isProviderBillingError(new Error("429 You exceeded your current quota, please check your plan and billing details."))).toBe(true);
    expect(isProviderBillingError(new Error("insufficient_quota"))).toBe(true);
    expect(isProviderBillingError(Object.assign(new Error("x"), { status: 402 }))).toBe(true);
  });
  it("does not treat ordinary failures as billing problems", () => {
    for (const m of ["the model returned no article body", "Expected ',' or ']'", "529 overloaded_error", "fetch failed", "401 invalid x-api-key"]) {
      expect(isProviderBillingError(new Error(m)), m).toBe(false);
    }
    expect(isProviderBillingError(undefined)).toBe(false);
  });
  it("the customer message never names a provider account", () => {
    expect(PROVIDER_WAIT_MESSAGE).not.toMatch(/anthropic|openai|credit balance|billing/i);
  });
});
