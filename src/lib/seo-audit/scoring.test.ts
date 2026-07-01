import { describe, it, expect } from "vitest";
import { computeScoresAndIssues } from "./scoring";
import type { ScanResult } from "./types";

/** A "perfect" scan: everything present and well-sized. */
function perfectScan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    statusCode: 200,
    loadMs: 400,
    ok: true,
    https: true,
    title: "A well written page title about widgets",
    titleLength: 40,
    metaDescription: "x".repeat(150),
    metaDescriptionLength: 150,
    canonical: "https://example.com/",
    robotsMeta: null,
    viewport: true,
    lang: "en",
    ogTags: 4,
    h1: ["Main heading"],
    h2Count: 3,
    h3Count: 2,
    imageCount: 5,
    imagesMissingAlt: 0,
    internalLinks: 8,
    externalLinks: 2,
    wordCount: 900,
    textRatio: 0.4,
    robotsTxt: { found: true, sitemaps: ["https://example.com/sitemap.xml"], blocksAll: false },
    sitemap: { found: true, urlCount: 20 },
    schemaTypes: ["Article"],
    hasJsonLd: true,
    htmlBytes: 50_000,
    ...overrides,
  };
}

describe("computeScoresAndIssues — scores are bounded 0..100", () => {
  it("clamps all sub-scores into range for a perfect scan", () => {
    const { scores } = computeScoresAndIssues(perfectScan());
    for (const v of Object.values(scores)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("gives a perfect scan a high overall score", () => {
    const { scores } = computeScoresAndIssues(perfectScan());
    expect(scores.overall).toBe(100);
    expect(scores.technical).toBe(100);
  });

  it("clamps a fully-broken scan to non-negative scores", () => {
    const broken = perfectScan({
      ok: false,
      statusCode: 500,
      https: false,
      title: null,
      titleLength: 0,
      metaDescription: null,
      metaDescriptionLength: 0,
      canonical: null,
      robotsMeta: "noindex",
      viewport: false,
      lang: null,
      h1: [],
      h2Count: 0,
      imageCount: 5,
      imagesMissingAlt: 5,
      internalLinks: 0,
      wordCount: 50,
      robotsTxt: { found: false, sitemaps: [], blocksAll: true },
      sitemap: { found: false, urlCount: 0 },
      schemaTypes: [],
      hasJsonLd: false,
      htmlBytes: 900_000,
      loadMs: 6000,
    });
    const { scores } = computeScoresAndIssues(broken);
    for (const v of Object.values(scores)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(scores.overall).toBeLessThan(50);
  });
});

describe("computeScoresAndIssues — issue derivation", () => {
  it("passes all core checks for a perfect scan (no criticals)", () => {
    const { issues } = computeScoresAndIssues(perfectScan());
    expect(issues.some((i) => i.severity === "critical")).toBe(false);
    expect(issues.some((i) => i.severity === "passed")).toBe(true);
  });

  it("flags a missing title as a critical onpage issue", () => {
    const { issues } = computeScoresAndIssues(perfectScan({ title: null, titleLength: 0 }));
    const t = issues.find((i) => i.title.includes("<title>"));
    expect(t?.severity).toBe("critical");
    expect(t?.issue_type).toBe("onpage");
  });

  it("flags a noindex robots meta as a critical indexing issue", () => {
    const { issues, scores } = computeScoresAndIssues(perfectScan({ robotsMeta: "noindex, nofollow" }));
    expect(issues.some((i) => i.title.toLowerCase().includes("noindex") && i.severity === "critical")).toBe(true);
    // noindex costs 50 indexing points.
    expect(scores.indexing).toBeLessThanOrEqual(50);
  });

  it("flags missing HTTPS as critical and reduces technical", () => {
    const { issues, scores } = computeScoresAndIssues(perfectScan({ https: false }));
    expect(issues.some((i) => i.title.includes("HTTPS") && i.severity === "critical")).toBe(true);
    expect(scores.technical).toBeLessThan(100);
  });

  it("marks images-missing-alt critical when more than half lack alt", () => {
    const { issues } = computeScoresAndIssues(perfectScan({ imageCount: 4, imagesMissingAlt: 3 }));
    const img = issues.find((i) => i.title.toLowerCase().includes("alt text"));
    expect(img?.severity).toBe("critical");
  });

  it("warns (not critical) when only some images lack alt", () => {
    const { issues } = computeScoresAndIssues(perfectScan({ imageCount: 10, imagesMissingAlt: 2 }));
    const img = issues.find((i) => i.title.toLowerCase().includes("alt text"));
    expect(img?.severity).toBe("warning");
  });

  it("attaches the finalUrl to derived issues", () => {
    const url = "https://mysite.test/page";
    const { issues } = computeScoresAndIssues(perfectScan({ finalUrl: url, https: false }));
    expect(issues.every((i) => i.affected_url === url)).toBe(true);
  });
});
