import { describe, it, expect } from "vitest";
import {
  isSensitiveEmail, canSend, modeAllows, estimateScanCredits,
  EMAIL_CATEGORIES, PERMISSION_MODES, DEFAULT_PERMISSION_MODE,
} from "./safety";
import { classifyEmail, draftReply, willUseRealEmailAI } from "./ai";

describe("sensitive-topic detection (auto-send blocklist)", () => {
  it("flags legal/financial/security/medical/dispute topics", () => {
    expect(isSensitiveEmail({ subject: "Invoice #4821 due", body: "" })).toBe(true);
    expect(isSensitiveEmail({ subject: "Your lawyer called", body: "" })).toBe(true);
    expect(isSensitiveEmail({ subject: "Security alert on your account", body: "" })).toBe(true);
    expect(isSensitiveEmail({ subject: "Refund request", body: "" })).toBe(true);
    expect(isSensitiveEmail({ subject: "Lunch on Friday?", body: "Just checking in" })).toBe(false);
  });
  it("billing category is sensitive regardless of wording", () => {
    expect(isSensitiveEmail({ subject: "Hello", body: "Hi", category: "billing" })).toBe(true);
  });
});

describe("send gate", () => {
  it("read_summarize can never send", () => {
    expect(canSend({ mode: "read_summarize", manualApproval: true, sensitive: false }).allowed).toBe(false);
  });
  it("manual approval sends in drafting modes", () => {
    expect(canSend({ mode: "draft_assistant", manualApproval: true, sensitive: true }).allowed).toBe(true);
  });
  it("auto-send requires assisted_automation AND non-sensitive", () => {
    expect(canSend({ mode: "draft_assistant", manualApproval: false, sensitive: false }).allowed).toBe(false);
    expect(canSend({ mode: "assisted_automation", manualApproval: false, sensitive: true }).allowed).toBe(false);
    expect(canSend({ mode: "assisted_automation", manualApproval: false, sensitive: false }).allowed).toBe(true);
  });
});

describe("permission modes", () => {
  it("default is draft assistant; capabilities scale correctly", () => {
    expect(DEFAULT_PERMISSION_MODE).toBe("draft_assistant");
    expect(PERMISSION_MODES).toHaveLength(3);
    expect(modeAllows("read_summarize", "draft")).toBe(false);
    expect(modeAllows("draft_assistant", "draft")).toBe(true);
    expect(modeAllows("draft_assistant", "auto_send")).toBe(false);
    expect(modeAllows("assisted_automation", "auto_send")).toBe(true);
  });
});

describe("scan credit estimation", () => {
  it("5 credits per 25 emails, minimum one bundle", () => {
    expect(estimateScanCredits(1)).toBe(5);
    expect(estimateScanCredits(25)).toBe(5);
    expect(estimateScanCredits(26)).toBe(10);
    expect(estimateScanCredits(50)).toBe(10);
  });
});

describe("AI placeholder pipeline (no API key)", () => {
  it("classifies with all 11 categories available", async () => {
    if (willUseRealEmailAI()) return;
    expect(EMAIL_CATEGORIES).toHaveLength(11);
    const { result, usedAI } = await classifyEmail({ fromName: "Mike", subject: "Problem with my order", body: "It is broken, please help ASAP" });
    expect(usedAI).toBe(false);
    expect(["support", "urgent"]).toContain(result.category);
    expect(result.needsReply).toBe(true);
    expect(result.attentionReason).toBeTruthy();
  });
  it("drafts vary by tone and never fabricate commitments", async () => {
    if (willUseRealEmailAI()) return;
    const { draft: apologetic } = await draftReply({ fromName: "Mike Torres", subject: "Broken export" }, "apologetic");
    const { draft: sales } = await draftReply({ fromName: "Mike Torres", subject: "Broken export" }, "sales");
    expect(apologetic).toContain("sorry");
    expect(apologetic).not.toBe(sales);
    expect(apologetic).toContain("Mike");
  });
});
