import { describe, it, expect } from "vitest";
import { assignPublishHours, isSiteDue, slotsDue, startOfUtcDay } from "./schedule";
import { CREDITS_PER_POST, estimateMonthlyCredits, siteLimitForPlan } from "./limits";
import { filterNewTopics, similarity, type Topic } from "./topics";
import { composeArticleHtml, faqToHtml } from "../compose";
import { withMedicalDisclaimer } from "../health";

describe("assignPublishHours", () => {
  it("is stable for the same site and daytime-only", () => {
    expect(assignPublishHours(1, "site-a")).toEqual(assignPublishHours(1, "site-a"));
    for (const seed of ["a", "b", "c", "d", "e", "f", "g"]) {
      const [h] = assignPublishHours(1, seed);
      expect(h).toBeGreaterThanOrEqual(8);
      expect(h).toBeLessThanOrEqual(16);
    }
  });
  it("gives two spread-out slots for 2 posts a day", () => {
    const hours = assignPublishHours(2, "site-x");
    expect(hours).toHaveLength(2);
    expect(hours[1] - hours[0]).toBe(8);
  });
});

describe("isSiteDue", () => {
  const at = (hour: number) => new Date(Date.UTC(2026, 9, 17, hour, 5));
  it("is not due before the slot", () => {
    expect(isSiteDue({ hours: [10], publishedToday: 0, now: at(9) })).toBe(false);
  });
  it("is due once the slot passes and nothing is published", () => {
    expect(isSiteDue({ hours: [10], publishedToday: 0, now: at(10) })).toBe(true);
    expect(isSiteDue({ hours: [10], publishedToday: 0, now: at(15) })).toBe(true); // catch-up after a miss
  });
  it("is not due again after publishing", () => {
    expect(isSiteDue({ hours: [10], publishedToday: 1, now: at(15) })).toBe(false);
  });
  it("handles two slots", () => {
    expect(slotsDue([8, 16], 9)).toBe(1);
    expect(isSiteDue({ hours: [8, 16], publishedToday: 1, now: at(12) })).toBe(false);
    expect(isSiteDue({ hours: [8, 16], publishedToday: 1, now: at(16) })).toBe(true);
  });
  it("startOfUtcDay returns midnight UTC", () => {
    expect(startOfUtcDay(at(13)).toISOString()).toBe("2026-10-17T00:00:00.000Z");
  });
});

describe("limits", () => {
  it("excludes the free trial and scales by plan", () => {
    expect(siteLimitForPlan("free")).toBe(0);
    expect(siteLimitForPlan("creator")).toBe(1);
    expect(siteLimitForPlan("pro")).toBe(3);
    expect(siteLimitForPlan("agency")).toBe(10);
    expect(siteLimitForPlan("enterprise")).toBe(50);
  });
  it("estimates monthly credits from the per-post cost", () => {
    expect(CREDITS_PER_POST).toBe(25);
    expect(estimateMonthlyCredits(1)).toBe(750);
    expect(estimateMonthlyCredits(2)).toBe(1500);
  });
});

describe("topic de-duplication", () => {
  const t = (keyword: string): Topic => ({ keyword, title: keyword, secondaryKeywords: [], intent: "Informational" });
  it("measures similarity on meaningful words", () => {
    expect(similarity("type 2 diabetes symptoms", "symptoms of type 2 diabetes")).toBeGreaterThan(0.6);
    expect(similarity("type 2 diabetes symptoms", "how vaccines train the immune system")).toBeLessThan(0.2);
  });
  it("drops topics that repeat existing titles or each other", () => {
    const kept = filterNewTopics(
      [t("symptoms of type 2 diabetes"), t("how vaccines work"), t("how vaccines work in the body"), t("sleep and memory")],
      ["Type 2 diabetes symptoms: a complete guide"]
    );
    expect(kept.map((k) => k.keyword)).toEqual(["how vaccines work", "sleep and memory"]);
  });
});

describe("composeArticleHtml", () => {
  const faq = [{ q: "Is it safe?", a: "Ask a doctor <first>." }];
  it("escapes and renders the FAQ", () => {
    const html = faqToHtml(faq);
    expect(html).toContain("<h2>Frequently asked questions</h2>");
    expect(html).toContain("&lt;first&gt;");
  });
  it("puts the FAQ before the medical disclaimer", () => {
    const withDisc = withMedicalDisclaimer("<h2>Body</h2><p>Text</p>");
    const out = composeArticleHtml(withDisc, faq);
    expect(out.indexOf("Frequently asked questions")).toBeLessThan(out.indexOf("Medical disclaimer"));
    expect(out.trimEnd().endsWith("</p>")).toBe(true);
  });
  it("returns the body unchanged when there is no FAQ", () => {
    expect(composeArticleHtml("<p>Hi</p>", [])).toBe("<p>Hi</p>");
  });
});
