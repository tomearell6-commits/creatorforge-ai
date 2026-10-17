import { describe, it, expect } from "vitest";
import { articleImagePrompt, findRiskyHealthClaims, isHealthTopic, MEDICAL_DISCLAIMER_MARKER, withMedicalDisclaimer } from "./health";
import { countWords } from "./generate";

describe("isHealthTopic", () => {
  it("detects health and medical topics", () => {
    expect(isHealthTopic("type 2 diabetes symptoms")).toBe(true);
    expect(isHealthTopic("how the immune system works")).toBe(true);
    expect(isHealthTopic("keyword", "cardiology education")).toBe(true);
  });
  it("does not flag ordinary marketing topics", () => {
    expect(isHealthTopic("SEO keyword research tips")).toBe(false);
    expect(isHealthTopic("how to find customer pain points")).toBe(false);
  });
});

describe("findRiskyHealthClaims", () => {
  it("flags guaranteed cures, miracle claims and stop-your-medication advice", () => {
    expect(findRiskyHealthClaims("<p>This is guaranteed to cure your condition.</p>").length).toBeGreaterThan(0);
    expect(findRiskyHealthClaims("<p>A miracle cure for everyone.</p>").length).toBeGreaterThan(0);
    expect(findRiskyHealthClaims("<p>You should stop taking your medication today.</p>").length).toBeGreaterThan(0);
  });
  it("allows normal educational sentences", () => {
    expect(findRiskyHealthClaims("<p>There is currently no cure for type 1 diabetes, but it can be managed.</p>")).toEqual([]);
    expect(findRiskyHealthClaims("<p>Talk to your doctor before changing any medication.</p>")).toEqual([]);
  });
});

describe("withMedicalDisclaimer", () => {
  it("appends the disclaimer once", () => {
    const once = withMedicalDisclaimer("<p>Body</p>");
    expect(once).toContain(MEDICAL_DISCLAIMER_MARKER);
    expect(withMedicalDisclaimer(once)).toBe(once);
  });
});

describe("articleImagePrompt", () => {
  it("always asks for realistic, text-free imagery", () => {
    const p = articleImagePrompt({ subject: "healthy sleep habits", health: false });
    expect(p).toContain("realistic");
    expect(p).toContain("no text");
  });
  it("adds extra care for health topics", () => {
    const p = articleImagePrompt({ subject: "diabetes", health: true });
    expect(p).toContain("before-and-after");
  });
});

describe("countWords", () => {
  it("counts visible words and ignores tags and scripts", () => {
    expect(countWords("<h2>Hello world</h2><p>one two three</p><script>ignored words here</script>")).toBe(5);
  });
});
