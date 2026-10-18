import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const ask = vi.fn();
vi.mock("@/lib/seo/research/analyze", () => ({ askJson: (...a: unknown[]) => ask(...a) }));
const http = vi.fn();
vi.mock("@/lib/http", () => ({ fetchWithTimeout: (...a: unknown[]) => http(...a) }));

import { footerSnippet, runOffer, schemaSnippet } from "./fixes";
import type { FixOffer, SiteScan } from "./site";

const site = (over: Partial<SiteScan> = {}): SiteScan => ({
  origin: "https://shop.example", host: "shop.example", pagesCrawled: 3, pagesDiscovered: 3, isShop: true, lang: "en",
  pages: [
    { url: "https://shop.example/", status: 200, title: "Shop Example | Mailers", metaDescription: null, h1Count: 1, words: 400, imageCount: 0, imagesMissingAlt: 0, internalLinks: 4, schemaTypes: [], canonical: null, noindex: false, snippet: "We sell poly mailers in bulk." },
    { url: "https://shop.example/a", status: 200, title: "Same", metaDescription: null, h1Count: 1, words: 400, imageCount: 0, imagesMissingAlt: 0, internalLinks: 4, schemaTypes: [], canonical: null, noindex: false, snippet: "Page a text." },
    { url: "https://shop.example/b", status: 200, title: "Same", metaDescription: null, h1Count: 1, words: 400, imageCount: 0, imagesMissingAlt: 0, internalLinks: 4, schemaTypes: [], canonical: null, noindex: false, snippet: "Page b text." },
  ],
  essentials: [
    { id: "about", label: "About page", required: true, found: true, url: "https://shop.example/about-us", linkedFromFooter: false },
    { id: "faq", label: "FAQ page", required: true, found: false, url: null, linkedFromFooter: false },
    { id: "privacy", label: "Privacy policy", required: true, found: false, url: null, linkedFromFooter: false },
    { id: "blog", label: "Blog / articles", required: false, found: false, url: null, linkedFromFooter: false },
  ],
  footer: { found: true, linkCount: 1, hasContact: false, hasCopyright: false, essentialsLinked: [] }, trust: { emails: ["hello@shop.example"], phones: [], addressHint: false },
  duplicateTitles: [], duplicateDescriptions: [], missingDescriptions: [], missingH1: [], thinPages: [], badTitleLength: [], imagesMissingAlt: 0, schemaOnHome: [], brokenLinks: [],
  homeTitle: "Shop Example | Mailers", homeDescription: "Bulk poly mailers", homeText: "We sell poly mailers in bulk to online shops.", ...over,
});

const offer = (over: Partial<FixOffer>): FixOffer => ({ id: "x", fix: "create_page", title: "t", why: "w", credits: 15, mode: "paste", severity: "warning", ...over });

beforeEach(() => ask.mockReset());

describe("footerSnippet", () => {
  const r = footerSnippet(site());
  const code = (r as { code: string }).code;
  it("links the pages that exist and the addresses new pages will use, never a blog that does not exist", () => {
    expect(code).toContain('href="/about-us"');
    expect(code).toContain('href="/faq/"');
    expect(code).toContain('href="/privacy-policy/"');
    expect(code).not.toContain("Blog");
  });
  it("uses the real email and leaves a marker only for what is unknown", () => {
    expect(code).toContain("hello@shop.example");
    expect(code).not.toContain("[Fill in: your email address]");
    expect(footerSnippet(site({ trust: { emails: [], phones: [], addressHint: false } })).kind).toBe("paste");
    expect((footerSnippet(site({ trust: { emails: [], phones: [], addressHint: false } })) as { code: string }).code).toContain("[Fill in: your email address]");
  });
  it("gives instructions for the common platforms", () => {
    expect((r as { instructions: string[] }).instructions.join(" ")).toMatch(/WordPress/);
  });
});

describe("schemaSnippet", () => {
  const code = (schemaSnippet(site()) as { code: string }).code;
  const json = JSON.parse(code.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""));
  it("is valid JSON-LD built only from what the site shows", () => {
    expect(json["@context"]).toBe("https://schema.org");
    const org = json["@graph"].find((x: { "@type": string }) => x["@type"] === "Organization");
    expect(org.name).toBe("Shop Example");
    expect(org.url).toBe("https://shop.example");
    expect(org.contactPoint.email).toBe("hello@shop.example");
    expect(org.telephone).toBeUndefined();
    expect(code).not.toMatch(/aggregateRating|review|address/i);
  });
});

describe("runOffer: create_page", () => {
  const body = "<h2>About us</h2><p>" + "We sell poly mailers in bulk to online shops and ship them in cartons. ".repeat(6) + "</p><p>Founded in [Fill in: year].</p>";
  it("returns ready-to-paste text for a site that is not connected, with the markers listed", async () => {
    ask.mockResolvedValueOnce({ title: "About Us", html: body, notes: [] });
    const r = await runOffer(offer({ page: "about" }), { site: site(), wp: null });
    expect(r.kind).toBe("paste");
    if (r.kind === "paste") {
      expect(r.placeholders).toEqual(["[Fill in: year]"]);
      expect(r.notes.join(" ")).toMatch(/Fill in/);
    }
    // The prompt carries the no-invention rule and only the site's own material.
    expect(String(ask.mock.calls[0][0])).toMatch(/NEVER invent/);
  });
  it("labels legal pages as templates, not legal advice", async () => {
    ask.mockResolvedValueOnce({ title: "Privacy Policy", html: body, notes: [] });
    const r = await runOffer(offer({ page: "privacy" }), { site: site(), wp: null });
    expect(r.kind === "paste" && r.notes.join(" ")).toMatch(/not legal advice/);
  });
  it("rejects a page that comes back too short, so nothing is charged", async () => {
    ask.mockResolvedValueOnce({ title: "About", html: "<p>Too short.</p>" });
    await expect(runOffer(offer({ page: "about" }), { site: site(), wp: null })).rejects.toThrow(/too short/);
  });
  it("strips scripts from the written page", async () => {
    ask.mockResolvedValueOnce({ title: "FAQ", html: body + "<script>alert(1)</script>" });
    const r = await runOffer(offer({ page: "faq" }), { site: site(), wp: null });
    expect(r.kind === "paste" && r.html).not.toMatch(/<script/i);
  });
});

describe("runOffer: create_page on a connected site that will not take pages", () => {
  it("hands back the written page to paste instead of failing", async () => {
    const body = "<h2>FAQ</h2><p>" + "We sell poly mailers in bulk to online shops and ship them in cartons. ".repeat(6) + "</p>";
    ask.mockResolvedValueOnce({ title: "FAQ", html: body });
    http.mockResolvedValueOnce({ ok: false, status: 404 });
    const r = await runOffer(offer({ page: "faq" }), { site: site(), wp: { siteUrl: "https://shop.example", username: "u", appPassword: "p" } });
    expect(r.kind).toBe("paste");
    if (r.kind === "paste") expect(r.notes.join(" ")).toMatch(/404/);
  });
});

describe("runOffer: meta_rewrites", () => {
  it("keeps only rows for pages that exist, trims lengths, and returns a paste table", async () => {
    ask.mockResolvedValueOnce({ pages: [
      { url: "https://shop.example/a", title: "A".repeat(90), description: "D ".repeat(120) },
      { url: "https://evil.example/x", title: "Not ours", description: "Nope" },
      { url: "https://shop.example/b", title: "Bulk poly mailers", description: "Compare sizes and prices for bulk poly mailers." },
    ] });
    const r = await runOffer(offer({ fix: "meta_rewrites", targets: ["https://shop.example/a", "https://shop.example/b"] }), { site: site(), wp: null });
    expect(r.kind === "paste" && r.rows?.map((x) => x.url)).toEqual(["https://shop.example/a", "https://shop.example/b"]);
    if (r.kind === "paste" && r.rows) {
      expect(r.rows[0].title.length).toBeLessThanOrEqual(65);
      expect(r.rows[0].description.length).toBeLessThanOrEqual(160);
    }
  });
  it("fails (and so charges nothing) when nothing usable comes back", async () => {
    ask.mockResolvedValueOnce({ pages: [] });
    await expect(runOffer(offer({ fix: "meta_rewrites", targets: ["https://shop.example/a"] }), { site: site(), wp: null })).rejects.toThrow();
  });
});
