import { describe, expect, it } from "vitest";
import { countInternalLinks, ensureInternalLinks } from "./links";

const SITE = "https://example-farm.com";
const POOL = [
  { url: `${SITE}/soil-test-matching/`, title: "Soil Test Matching" },
  { url: `${SITE}/custom-blending/`, title: "Custom Fertiliser Blending" },
  { url: `${SITE}/privacy-policy/`, title: "Privacy Policy" },
  { url: `${SITE}/2026/09/08/bulk-urea-suppliers-australia/`, title: "Bulk Urea Suppliers in Australia" },
  { url: `${SITE}/`, title: "Home" },
];

describe("internal links", () => {
  it("counts only links to the site itself (not #anchors or other sites)", () => {
    const html = `<a href="#toc">x</a><a href="https://other.com/a">y</a><a href="${SITE}/faq/">z</a><a href="/about/">w</a>`;
    expect(countInternalLinks(html, SITE)).toBe(2);
  });
  it("leaves an article alone when it already links enough", () => {
    const html = `<p><a href="${SITE}/a/">a</a> <a href="${SITE}/b/">b</a></p>`;
    expect(ensureInternalLinks(html, POOL, { siteUrl: SITE, keyword: "buy urea in bulk", title: "Buy Urea" }).added).toBe(0);
  });
  it("adds relevant related reading, skipping legal pages, home and the page itself", () => {
    const html = `<p>No links <a href="#x">toc</a></p>`;
    const r = ensureInternalLinks(html, POOL, { siteUrl: SITE, keyword: "bulk urea custom blending", title: "Bulk urea and custom blending quotes" });
    expect(r.added).toBeGreaterThanOrEqual(2);
    expect(r.html).toContain("Related reading");
    expect(r.html).toContain("custom-blending");
    expect(r.html).toContain("bulk-urea-suppliers-australia");
    expect(r.html).not.toContain("privacy-policy");
  });
  it("adds nothing when nothing is relevant", () => {
    const r = ensureInternalLinks("<p>x</p>", POOL, { siteUrl: SITE, keyword: "quantum computing", title: "Quantum" });
    expect(r.added).toBe(0);
  });
});
