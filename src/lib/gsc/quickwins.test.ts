import { describe, expect, it } from "vitest";
import { benchmarkCtr, findQuickWins } from "./quickwins";

const page = (url: string, impressions: number, clicks: number, position: number) => ({ keys: [url], impressions, clicks, ctr: impressions ? clicks / impressions : 0, position });

describe("benchmarkCtr", () => {
  it("falls as the position gets worse", () => {
    expect(benchmarkCtr(1)).toBeGreaterThan(benchmarkCtr(3));
    expect(benchmarkCtr(3)).toBeGreaterThan(benchmarkCtr(10));
    expect(benchmarkCtr(10)).toBeGreaterThan(benchmarkCtr(30));
  });
});

describe("findQuickWins", () => {
  it("flags a page-1 page that is seen a lot but rarely clicked", () => {
    const wins = findQuickWins([page("https://x.com/a", 200, 1, 8)], []);
    expect(wins).toHaveLength(1);
    expect(wins[0].kind).toBe("low_ctr");
    expect(wins[0].potentialClicks).toBeGreaterThan(1);
  });
  it("does not flag a page-1 page that already earns a healthy click rate", () => {
    expect(findQuickWins([page("https://x.com/a", 200, 12, 8)], [])).toHaveLength(0);
  });
  it("flags page-2 pages as striking distance", () => {
    const wins = findQuickWins([page("https://x.com/b", 150, 0, 14)], []);
    expect(wins[0].kind).toBe("striking");
  });
  it("ignores pages with too little data or buried deep", () => {
    expect(findQuickWins([page("https://x.com/c", 10, 0, 8), page("https://x.com/d", 500, 0, 45)], [])).toHaveLength(0);
  });
  it("ranks by potential and attaches each page's top searches", () => {
    const rows = [page("https://x.com/small", 40, 0, 9), page("https://www.x.com/big/", 400, 2, 7)];
    const q = [
      { keys: ["https://x.com/big", "poly mailers bulk"], impressions: 300, clicks: 1, position: 7 },
      { keys: ["https://x.com/big", "poly mailer price"], impressions: 100, clicks: 1, position: 8 },
      { keys: ["https://x.com/small", "other"], impressions: 40, clicks: 0, position: 9 },
    ];
    const wins = findQuickWins(rows, q);
    expect(wins[0].url).toContain("/big");
    expect(wins[0].queries.map((x) => x.query)).toEqual(["poly mailers bulk", "poly mailer price"]);
  });
  it("returns nothing when Google has returned nothing", () => {
    expect(findQuickWins(undefined, undefined)).toEqual([]);
  });
});
