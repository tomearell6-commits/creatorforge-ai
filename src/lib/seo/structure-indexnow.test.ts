import { afterEach, describe, expect, it, vi } from "vitest";
// indexnow.ts reaches ssrf.ts, which imports "server-only" (not installed for the test env).
vi.mock("server-only", () => ({}));
import { addHeadingAnchorsAndToc, analyzeStructure } from "./structure";
import { generateIndexNowKey, isValidIndexNowKey, submitToIndexNow, blogPostUrl, CREATORSFORGE_INDEXNOW_KEY } from "./indexnow";

const para = (n: number) => `<p>${"word ".repeat(n)}</p>`;
const good =
  para(110) +
  "<h2>Key takeaways</h2><ul><li>One</li><li>Two</li></ul>" +
  [1, 2, 3, 4, 5, 6, 7].map((i) => `<h2>Section ${i}</h2>${para(120)}<h3>Detail ${i}</h3>${para(60)}`).join("") +
  "<h2>Conclusion</h2>" + para(60);

describe("analyzeStructure", () => {
  it("accepts a well-structured article", () => {
    const r = analyzeStructure(good);
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.h2).toBeGreaterThanOrEqual(6);
  });
  it("flags an H1, H4, empty headings and a missing intro", () => {
    const r = analyzeStructure("<h1>Title</h1><h4>x</h4><h2></h2>" + good.replace(para(110), ""));
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/H1/);
    expect(r.issues.join(" ")).toMatch(/H4/);
    expect(r.issues.join(" ")).toMatch(/empty heading/);
    expect(r.issues.join(" ")).toMatch(/introduction/);
  });
  it("flags too few H2s and an H3 before the first H2", () => {
    const r = analyzeStructure(para(100) + "<h3>Early</h3>" + para(50) + "<h2>Only</h2>" + para(120));
    expect(r.issues.join(" ")).toMatch(/H2 sections/);
    expect(r.issues.join(" ")).toMatch(/before the first H2/);
  });
  it("flags thin sections but not short takeaways/conclusion", () => {
    const thin = good.replace(para(120), "<p>short</p>");
    expect(analyzeStructure(thin).issues.join(" ")).toMatch(/too thin/);
    expect(analyzeStructure(good).issues).toEqual([]);
  });
});

describe("addHeadingAnchorsAndToc", () => {
  it("adds anchors and an In this article list, once", () => {
    const out = addHeadingAnchorsAndToc(good);
    expect(out).toContain('class="cf-toc"');
    expect(out).toContain('id="section-1"');
    expect(out).toContain('href="#section-1"');
    expect(addHeadingAnchorsAndToc(out)).toBe(out);
  });
  it("keeps ids unique", () => {
    const out = addHeadingAnchorsAndToc(para(100) + "<h2>Same</h2>" + para(120) + "<h2>Same</h2>" + para(120) + "<h2>Three</h2><h2>Four</h2>");
    expect(out).toContain('id="same"');
    expect(out).toContain('id="same-2"');
  });
});

describe("IndexNow", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("validates and generates keys", () => {
    expect(isValidIndexNowKey(generateIndexNowKey())).toBe(true);
    expect(isValidIndexNowKey(CREATORSFORGE_INDEXNOW_KEY)).toBe(true);
    expect(isValidIndexNowKey("short")).toBe(false);
    expect(isValidIndexNowKey("has space in it!!")).toBe(false);
  });
  it("builds blog URLs", () => {
    expect(blogPostUrl("my-post")).toBe("https://www.creatorsforge.io/blog/my-post");
  });
  it("reports a successful submission", async () => {
    const f = vi.fn().mockResolvedValue(new Response("", { status: 202 }));
    vi.stubGlobal("fetch", f);
    const r = await submitToIndexNow({ host: "example.org", key: "abcdef1234567890", urls: ["https://example.org/a"] });
    expect(r.status).toBe("submitted");
    const sent = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.host).toBe("example.org");
    expect(sent.keyLocation).toBe("https://example.org/abcdef1234567890.txt");
    expect(sent.urlList).toEqual(["https://example.org/a"]);
  });
  it("explains a rejected key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 403 })));
    const r = await submitToIndexNow({ host: "example.org", key: "abcdef1234567890", urls: ["https://example.org/a"] });
    expect(r.status).toBe("failed");
    expect(r.message).toMatch(/key file/);
  });
  it("never throws on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const r = await submitToIndexNow({ host: "example.org", key: "abcdef1234567890", urls: ["https://example.org/a"] });
    expect(r.status).toBe("failed");
  });
});
