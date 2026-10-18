import { describe, expect, it } from "vitest";
import { articleResults, dailySeries, dateRange, pageKey, pctChange, pickProperty, totalsFrom } from "./overview";

describe("pickProperty", () => {
  const props = [
    { siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" },
    { siteUrl: "https://www.example.com/", permissionLevel: "siteOwner" },
    { siteUrl: "https://other.com/", permissionLevel: "siteOwner" },
  ];
  it("prefers the exact https site, then a domain property", () => {
    expect(pickProperty(props, "www.example.com")).toBe("https://www.example.com/");
    expect(pickProperty(props.slice(0, 1), "www.example.com")).toBe("sc-domain:example.com");
    expect(pickProperty(props.slice(0, 1), "blog.example.com")).toBe("sc-domain:example.com");
  });
  it("matches www and non-www versions of the same site", () => {
    expect(pickProperty([{ siteUrl: "https://example.com/", permissionLevel: "siteOwner" }], "www.example.com")).toBe("https://example.com/");
  });
  it("ignores unverified properties, other sites and sub-folder properties", () => {
    expect(pickProperty([{ siteUrl: "https://example.com/", permissionLevel: "siteUnverifiedUser" }], "example.com")).toBeNull();
    expect(pickProperty(props, "unrelated.org")).toBeNull();
    expect(pickProperty([{ siteUrl: "https://example.com/blog/", permissionLevel: "siteOwner" }], "example.com")).toBeNull();
    expect(pickProperty([{ siteUrl: "sc-domain:notexample.com", permissionLevel: "siteOwner" }], "example.com")).toBeNull();
  });
});

describe("dateRange", () => {
  it("ends two days ago and gives an equal earlier window", () => {
    const r = dateRange(28, new Date("2026-10-18T10:00:00Z"));
    expect(r.end).toBe("2026-10-16");
    expect(r.start).toBe("2026-09-19");
    expect(r.prevEnd).toBe("2026-09-18");
    expect(r.prevStart).toBe("2026-08-22");
  });
  it("keeps the window between 7 and 90 days", () => {
    expect(dateRange(1).days).toBe(7);
    expect(dateRange(500).days).toBe(90);
  });
});

describe("series and totals", () => {
  it("zero-fills days with no data", () => {
    const s = dailySeries([{ keys: ["2026-10-02"], clicks: 3, impressions: 40 }], "2026-10-01", "2026-10-03");
    expect(s).toEqual([
      { date: "2026-10-01", clicks: 0, impressions: 0 },
      { date: "2026-10-02", clicks: 3, impressions: 40 },
      { date: "2026-10-03", clicks: 0, impressions: 0 },
    ]);
  });
  it("gives zero totals when Google returns nothing", () => {
    expect(totalsFrom(undefined)).toEqual({ clicks: 0, impressions: 0, ctr: 0, position: 0 });
  });
  it("does not report a percentage change from zero", () => {
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(15, 10)).toBe(50);
    expect(pctChange(5, 10)).toBe(-50);
  });
});

describe("article results", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  const articles = [
    { title: "A", url: "https://www.example.com/articles/a/", publishedAt: "2026-10-10T00:00:00Z" },
    { title: "B", url: "https://example.com/articles/b", publishedAt: null },
  ];
  it("matches pages however the address is written and keeps zeros for pages with no impressions", () => {
    const rows = [{ keys: ["https://example.com/articles/a"], clicks: 2, impressions: 90, position: 14.26 }];
    const r = articleResults(articles, rows, now);
    expect(r[0]).toMatchObject({ clicks: 2, impressions: 90, position: 14.3, daysLive: 10 });
    expect(r[1]).toMatchObject({ clicks: 0, impressions: 0, position: null, daysLive: null });
  });
  it("normalises addresses for matching", () => {
    expect(pageKey("https://WWW.Example.com/a/?utm=1#x")).toBe(pageKey("https://example.com/a"));
  });
});
