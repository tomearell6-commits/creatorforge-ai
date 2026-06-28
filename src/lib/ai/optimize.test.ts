import { describe, it, expect, beforeAll } from "vitest";
import { optimize } from "./optimize";

describe("optimize (placeholder path)", () => {
  beforeAll(() => { delete process.env.ANTHROPIC_API_KEY; });

  it("returns complete SEO metadata without an API key", async () => {
    const { result, usedAI } = await optimize({ title: "A Haunted Lighthouse", category: "horror-stories" });
    expect(usedAI).toBe(false);
    expect(result.seoTitle).toContain("Haunted Lighthouse");
    expect(result.hashtags.length).toBeGreaterThan(0);
    expect(result.hashtags.every((h) => h.startsWith("#"))).toBe(true);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.cta).toBeTruthy();
    expect(result.captions.some((c) => c.platform === "youtube")).toBe(true);
  });
});
