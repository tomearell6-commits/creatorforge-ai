import { describe, expect, it } from "vitest";
import { cleanFacts, countFacts } from "./facts";

describe("cleanFacts", () => {
  it("keeps only known text fields, trimmed and on one line", () => {
    const f = cleanFacts({ email: "  hello@shop.example ", about: "We sell\n\n mailers.", evil: "x", phone: 5, payment: "" });
    expect(f).toEqual({ email: "hello@shop.example", about: "We sell mailers." });
  });
  it("caps lengths and strips control characters", () => {
    const f = cleanFacts({ businessName: "A".repeat(500), about: "B".repeat(900), hours: "9\u0000to 5" });
    expect(f.businessName?.length).toBe(250);
    expect(f.about?.length).toBe(600);
    expect(f.hours).toBe("9 to 5");
  });
  it("copes with junk input", () => {
    expect(cleanFacts(null)).toEqual({});
    expect(cleanFacts([1, 2])).toEqual({});
    expect(cleanFacts("x")).toEqual({});
    expect(countFacts(undefined)).toBe(0);
    expect(countFacts({ email: "a@b.co", phone: "1" })).toBe(2);
  });
});
