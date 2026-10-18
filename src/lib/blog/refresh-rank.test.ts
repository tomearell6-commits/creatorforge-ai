import { describe, expect, it } from "vitest";
import { refreshPriority, wordCount } from "./refresh-rank";

describe("refreshPriority", () => {
  it("ranks a very short, unindexed, old post above a healthy one", () => {
    const weak = refreshPriority({ words: 600, ageDays: 100, indexed: false, impressions: 0, position: null });
    const strong = refreshPriority({ words: 2000, ageDays: 100, indexed: true, impressions: 300, position: 5 });
    expect(weak.priority).toBeGreaterThan(strong.priority);
    expect(strong.priority).toBe(0);
    expect(weak.reasons.join(" ")).toMatch(/Short/);
    expect(weak.reasons.join(" ")).toMatch(/not indexed/);
  });
  it("treats under 900 words as worse than under 1,200", () => {
    expect(refreshPriority({ words: 800, ageDays: 5 }).priority).toBeGreaterThan(refreshPriority({ words: 1100, ageDays: 5 }).priority);
  });
  it("flags a page that is seen but ranks poorly", () => {
    const v = refreshPriority({ words: 1800, ageDays: 10, impressions: 90, position: 31 });
    expect(v.priority).toBeGreaterThan(0);
    expect(v.reasons[0]).toMatch(/position 31/);
  });
  it("does not add an age reason to an otherwise healthy post", () => {
    expect(refreshPriority({ words: 1800, ageDays: 400, indexed: true })).toEqual({ priority: 0, reasons: [] });
  });
  it("counts words ignoring tags", () => {
    expect(wordCount("<h2>Hello world</h2><p>one two&nbsp;three</p>")).toBe(5);
  });
});
