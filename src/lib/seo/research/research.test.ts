import { describe, expect, it } from "vitest";
import {
  cleanMarkdown, extractHeadings, hostOf, isCompetitorHost, pickInternalPages, pickPagesToStudy, summarizeCompetitors, wordCountOf,
} from "./evidence";
import { restrictLinks } from "../generate";

const hit = (url: string) => ({ url, title: url, description: "" });

describe("evidence helpers", () => {
  it("normalizes hosts and filters non-competitors", () => {
    expect(hostOf("https://www.Example.com/a?b=1")).toBe("example.com");
    expect(isCompetitorHost("example.com")).toBe(true);
    expect(isCompetitorHost("en.wikipedia.org")).toBe(false);
    expect(isCompetitorHost("www.youtube.com".replace(/^www\./, ""))).toBe(false);
  });

  it("cleans markdown and extracts headings without image or link markup", () => {
    const md = "## Why ![](https://x.com/a.svg)Google and [ChatGPT](https://y.com)\n\ntext **bold**\n\n### Sub heading\n\n## Second";
    expect(extractHeadings(md, 2)).toEqual(["Why Google and ChatGPT", "Second"]);
    expect(extractHeadings(md, 3)).toEqual(["Sub heading"]);
    expect(cleanMarkdown("a ![img](x.png) [link](http://z.com) b")).toBe("a link b");
    expect(wordCountOf("one two three\n\nfour")).toBe(4);
  });

  it("picks a few useful internal pages and ignores junk and other sites", () => {
    const links = [
      "https://shop.com/about-us", "/pricing", "https://shop.com/products/widget", "https://shop.com/cart", "https://shop.com/login",
      "https://shop.com/files/catalog.pdf", "https://other.com/about", "https://shop.com/", "https://shop.com/blog/a/b/c/d",
    ];
    const picked = pickInternalPages("https://shop.com", links, 3);
    expect(picked).toEqual(["https://shop.com/about-us", "https://shop.com/pricing", "https://shop.com/products/widget"]);
  });

  it("finds the competitors that keep ranking, excluding the brand itself and platforms", () => {
    const serp = [
      { keyword: "k1", hits: [hit("https://a.com/x"), hit("https://www.b.com/y"), hit("https://mysite.com/z"), hit("https://en.wikipedia.org/w")] },
      { keyword: "k2", hits: [hit("https://b.com/q"), hit("https://a.com/r")] },
    ];
    const c = summarizeCompetitors(serp, "mysite.com", 5);
    expect(c.map((x) => x.domain)).toEqual(["a.com", "b.com"]);
    expect(c[0].appearances).toBe(2);
    expect(c.find((x) => x.domain === "mysite.com")).toBeUndefined();
    expect(c.find((x) => x.domain === "en.wikipedia.org")).toBeUndefined();
  });

  it("picks the best-ranking page per domain to study", () => {
    const serp = [
      { keyword: "k1", hits: [hit("https://a.com/low"), hit("https://b.com/mid")] },
      { keyword: "k2", hits: [hit("https://c.com/top"), hit("https://a.com/high")] },
    ];
    const pages = pickPagesToStudy(serp, "mine.com", 3);
    expect(pages[0].rank).toBe(1);
    expect(new Set(pages.map((p) => p.url)).size).toBe(pages.length);
    expect(pages.filter((p) => p.url.includes("a.com")).length).toBe(1);
  });
});

describe("restrictLinks", () => {
  it("keeps allowed internal links and anchors, removes everything else", () => {
    const html =
      '<p>See <a href="https://shop.com/guide/">our guide</a>, <a href="https://evil.com/x">a made-up link</a> and <a href="#faq">the FAQ</a>.</p>';
    const out = restrictLinks(html, ["https://shop.com/guide"]);
    expect(out).toContain('<a href="https://shop.com/guide/">our guide</a>');
    expect(out).toContain('<a href="#faq">the FAQ</a>');
    expect(out).not.toContain("evil.com");
    expect(out).toContain("a made-up link"); // text is kept
  });
});
