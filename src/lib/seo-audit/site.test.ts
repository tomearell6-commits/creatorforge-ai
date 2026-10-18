import { describe, expect, it } from "vitest";
import { analyseFooter, buildOffers, detectEssentials, findDuplicates, findTrust, looksLikeShop, matchesEssential, siteIssues, sitePenalty, type PageLink, type PageScan, type SiteScan } from "./site";

const page = (url: string, over: Partial<PageScan> = {}): PageScan => ({
  url, status: 200, title: "T " + url, metaDescription: "A description that is long enough to count as one for this test page.", h1Count: 1, words: 500,
  imageCount: 0, imagesMissingAlt: 0, internalLinks: 5, schemaTypes: [], canonical: null, noindex: false, snippet: "", ...over,
});
const emptySite = (over: Partial<SiteScan> = {}): SiteScan => ({
  origin: "https://shop.example", host: "shop.example", pagesCrawled: 3, pagesDiscovered: 3, pages: [], isShop: true, lang: "en",
  essentials: [], footer: { found: true, linkCount: 0, hasContact: false, hasCopyright: false, essentialsLinked: [] }, trust: { emails: [], phones: [], addressHint: false },
  duplicateTitles: [], duplicateDescriptions: [], missingDescriptions: [], missingH1: [], thinPages: [], badTitleLength: [], imagesMissingAlt: 0,
  schemaOnHome: [], brokenLinks: [], homeTitle: null, homeDescription: null, homeText: "", ...over,
});

describe("matchesEssential", () => {
  it("recognises pages by address, link text or title", () => {
    expect(matchesEssential("faq", "https://x.com/faq")).toBe(true);
    expect(matchesEssential("about", "https://x.com/our-story")).toBe(true);
    expect(matchesEssential("privacy", "https://x.com/legal", "Privacy Policy")).toBe(true);
    expect(matchesEssential("contact", "https://x.com/shop", "", "Contact us | Shop")).toBe(true);
  });
  it("never treats the home page as an essential page", () => {
    expect(matchesEssential("about", "https://about-us-company.com/")).toBe(false);
  });
  it("does not confuse unrelated pages", () => {
    expect(matchesEssential("faq", "https://x.com/products/widgets")).toBe(false);
  });
});

describe("detectEssentials", () => {
  const pages = [page("https://shop.example/"), page("https://shop.example/about-us"), page("https://shop.example/privacy-policy"), page("https://shop.example/contact", { status: 404 })];
  const links: PageLink[] = [
    { href: "https://shop.example/about-us", text: "About us", inFooter: true },
    { href: "https://shop.example/contact", text: "Contact", inFooter: true },
  ];
  const e = detectEssentials(pages, links, true);
  const get = (id: string) => e.find((x) => x.id === id)!;
  it("finds pages that were fetched and answered 200", () => {
    expect(get("about").found).toBe(true);
    expect(get("privacy").found).toBe(true);
  });
  it("does not count a page that does not load, even if it is linked", () => {
    expect(get("contact").found).toBe(false);
  });
  it("reports footer links only for real pages", () => {
    expect(get("about").linkedFromFooter).toBe(true);
    expect(get("privacy").linkedFromFooter).toBe(false);
  });
  it("requires shipping & returns only for shops", () => {
    expect(get("returns").required).toBe(true);
    expect(detectEssentials(pages, links, false).find((x) => x.id === "returns")!.required).toBe(false);
  });
});

describe("shop, trust and footer detection", () => {
  it("spots a shop", () => {
    expect(looksLikeShop("Add to cart $19.00", [])).toBe(true);
    expect(looksLikeShop("Our story", ["https://x.com/products/a"])).toBe(true);
    expect(looksLikeShop("Our story and values", ["https://x.com/about"])).toBe(false);
  });
  it("finds email, phone and a street address", () => {
    const t = findTrust("Call +61 2 9999 1234 or email Hello@Shop.example. Visit 12 Market Street, Sydney.");
    expect(t.emails).toEqual(["hello@shop.example"]);
    expect(t.phones.length).toBeGreaterThan(0);
    expect(t.addressHint).toBe(true);
    expect(findTrust("Nothing here").emails).toEqual([]);
  });
  it("reads a footer", () => {
    const f = analyseFooter("<footer><a href='/privacy'>Privacy</a> © 2026 Shop. hello@shop.example</footer>", [{ href: "/privacy", text: "Privacy", inFooter: true }], []);
    expect(f).toMatchObject({ found: true, hasContact: true, hasCopyright: true });
    expect(analyseFooter(null, [], []).found).toBe(false);
  });
});

describe("duplicates", () => {
  it("groups pages that share a title, ignoring case and failed pages", () => {
    const d = findDuplicates([page("https://x/a", { title: "Same" }), page("https://x/b", { title: "same" }), page("https://x/c", { title: "Other" }), page("https://x/d", { title: "Same", status: 404 })], (p) => p.title);
    expect(d).toHaveLength(1);
    expect(d[0].urls).toEqual(["https://x/a", "https://x/b"]);
  });
});

describe("issues, penalty and offers", () => {
  const missing = emptySite({
    essentials: [
      { id: "about", label: "About page", required: true, found: true, url: "https://shop.example/about", linkedFromFooter: false },
      { id: "faq", label: "FAQ page", required: true, found: false, url: null, linkedFromFooter: false },
      { id: "privacy", label: "Privacy policy", required: true, found: false, url: null, linkedFromFooter: false },
      { id: "returns", label: "Shipping & returns policy", required: true, found: false, url: null, linkedFromFooter: false },
      { id: "blog", label: "Blog / articles", required: false, found: false, url: null, linkedFromFooter: false },
    ],
    missingDescriptions: ["https://shop.example/a", "https://shop.example/b"],
  });
  it("turns missing essentials into issues, privacy as critical, and never faults a missing blog as 'required'", () => {
    const issues = siteIssues(missing);
    expect(issues.find((i) => i.title === "Missing: Privacy policy")?.severity).toBe("critical");
    expect(issues.find((i) => i.title === "Missing: FAQ page")?.severity).toBe("warning");
    expect(issues.some((i) => i.title === "No blog or articles section")).toBe(true);
    expect(issues.some((i) => i.title === "Missing: Blog / articles")).toBe(false);
  });
  it("offers one priced page fix per missing required page, and prices come from the one price list", () => {
    const offers = buildOffers(missing, true);
    const pages = offers.filter((o) => o.fix === "create_page");
    expect(pages.map((o) => o.page).sort()).toEqual(["faq", "privacy", "returns"]);
    expect(pages.every((o) => o.credits === 15 && o.mode === "auto")).toBe(true);
    expect(buildOffers(missing, false).filter((o) => o.fix === "create_page").every((o) => o.mode === "paste")).toBe(true);
  });
  it("offers footer, structured data and metadata fixes only when they are needed", () => {
    const offers = buildOffers(missing, false);
    expect(offers.map((o) => o.id)).toEqual(expect.arrayContaining(["footer_links", "schema_org", "meta_rewrites"]));
    const clean = emptySite({
      essentials: [{ id: "about", label: "About page", required: true, found: true, url: "https://shop.example/about", linkedFromFooter: true }],
      footer: { found: true, linkCount: 3, hasContact: true, hasCopyright: true, essentialsLinked: ["about"] }, schemaOnHome: ["Organization"],
    });
    expect(buildOffers(clean, true)).toEqual([]);
  });
  it("prices metadata fixes per batch of ten pages", () => {
    const many = emptySite({ missingDescriptions: Array.from({ length: 23 }, (_, i) => `https://shop.example/p${i}`), schemaOnHome: ["Organization"], footer: { found: true, linkCount: 3, hasContact: true, hasCopyright: true, essentialsLinked: [] } });
    const meta = buildOffers(many, false).find((o) => o.id === "meta_rewrites")!;
    expect(meta.targets).toHaveLength(23);
    expect(meta.credits).toBe(30);
  });
  it("keeps the score penalty modest and capped", () => {
    expect(sitePenalty(missing)).toBeGreaterThan(0);
    expect(sitePenalty(missing)).toBeLessThanOrEqual(30);
  });
});
