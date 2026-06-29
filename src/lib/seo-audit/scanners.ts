/**
 * Modular SEO scanners (dependency-free, regex-based). Each scanner is a small
 * pure-ish function so the engine is easy to extend. Network access is limited
 * to the target page + /robots.txt + the first sitemap (no aggressive crawling),
 * each with a timeout. SSRF is enforced by validateAuditUrl before fetching.
 */
import "server-only";
import type { ScanResult } from "./types";

const UA = "Mozilla/5.0 (compatible; CreatorForgeSEOAudit/1.0; +https://www.creatorsforge.io)";
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 12_000;

async function fetchText(url: string, timeout = TIMEOUT_MS): Promise<{ ok: boolean; status: number; text: string; ms: number; finalUrl: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" }, redirect: "follow" });
    const raw = await res.text();
    return { ok: res.ok, status: res.status, text: raw.slice(0, MAX_BYTES), ms: Date.now() - started, finalUrl: res.url || url };
  } catch {
    return { ok: false, status: 0, text: "", ms: Date.now() - started, finalUrl: url };
  } finally { clearTimeout(t); }
}

const stripTags = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const attr = (tag: string, name: string) => new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag)?.[1] ?? null;

export function metadataScanner(html: string) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  let metaDescription: string | null = null, robotsMeta: string | null = null, viewport = false, ogTags = 0;
  for (const m of metaTags) {
    const nameAttr = (attr(m, "name") ?? attr(m, "property") ?? "").toLowerCase();
    if (nameAttr === "description") metaDescription = attr(m, "content");
    else if (nameAttr === "robots") robotsMeta = attr(m, "content");
    else if (nameAttr === "viewport") viewport = true;
    else if (nameAttr.startsWith("og:")) ogTags++;
  }
  const canonical = (html.match(/<link\b[^>]*>/gi) ?? []).map((l) => ({ rel: (attr(l, "rel") ?? "").toLowerCase(), href: attr(l, "href") })).find((l) => l.rel === "canonical")?.href ?? null;
  const lang = attr(/<html\b[^>]*>/i.exec(html)?.[0] ?? "", "lang");
  return { title, titleLength: title?.length ?? 0, metaDescription, metaDescriptionLength: metaDescription?.length ?? 0, canonical, robotsMeta, viewport, lang, ogTags };
}

export function headingScanner(html: string) {
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])).filter(Boolean);
  const h2Count = (html.match(/<h2[\s>]/gi) ?? []).length;
  const h3Count = (html.match(/<h3[\s>]/gi) ?? []).length;
  return { h1, h2Count, h3Count };
}

export function imageSeoScanner(html: string) {
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesMissingAlt = imgs.filter((i) => { const a = attr(i, "alt"); return a === null || a.trim() === ""; }).length;
  return { imageCount: imgs.length, imagesMissingAlt };
}

export function linkScanner(html: string, origin: string) {
  const hrefs = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  let internal = 0, external = 0;
  for (const h of hrefs) {
    if (h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("tel:") || h.startsWith("javascript:")) continue;
    if (h.startsWith("/") || h.includes(origin)) internal++;
    else if (/^https?:\/\//i.test(h)) external++;
    else internal++;
  }
  return { internalLinks: internal, externalLinks: external };
}

export function schemaScanner(html: string) {
  const ldBlocks = [...html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const types = new Set<string>();
  for (const b of ldBlocks) {
    for (const m of b.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) types.add(m[1]);
  }
  // microdata fallback
  for (const m of html.matchAll(/itemtype\s*=\s*["']https?:\/\/schema\.org\/([^"']+)["']/gi)) types.add(m[1]);
  return { schemaTypes: [...types], hasJsonLd: ldBlocks.length > 0 };
}

export function contentAnalyzer(html: string) {
  const text = stripTags(html);
  const wordCount = text ? text.split(/\s+/).length : 0;
  const textRatio = html.length ? Math.round((text.length / html.length) * 100) / 100 : 0;
  return { wordCount, textRatio };
}

export function performanceScanner(htmlBytes: number, loadMs: number) {
  // Rough heuristic from page weight + TTFB-ish total. Real CWV would need Lighthouse.
  return { htmlBytes, loadMs };
}

export async function robotsScanner(origin: string) {
  const r = await fetchText(`${origin}/robots.txt`, 8000);
  if (!r.ok || !r.text) return { found: false, sitemaps: [] as string[], blocksAll: false };
  const sitemaps = [...r.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  const blocksAll = /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*(\n|$)/i.test(r.text);
  return { found: true, sitemaps, blocksAll };
}

export async function sitemapScanner(sitemapUrl: string) {
  const r = await fetchText(sitemapUrl, 8000);
  if (!r.ok || !r.text) return { found: false, urlCount: 0 };
  const urlCount = (r.text.match(/<loc>/gi) ?? []).length;
  return { found: true, urlCount };
}

/** technicalSeoScanner composes file-level checks (robots + sitemap + https). */
export async function technicalSeoScanner(origin: string) {
  const robotsTxt = await robotsScanner(origin);
  const sitemapUrl = robotsTxt.sitemaps[0] ?? `${origin}/sitemap.xml`;
  const sitemap = await sitemapScanner(sitemapUrl);
  return { robotsTxt, sitemap };
}

/** Run the full scan for a validated URL. */
export async function runScan(targetUrl: string): Promise<ScanResult> {
  const u = new URL(targetUrl);
  const origin = u.origin;
  const page = await fetchText(targetUrl);
  const html = page.text;

  const meta = metadataScanner(html);
  const headings = headingScanner(html);
  const images = imageSeoScanner(html);
  const links = linkScanner(html, origin);
  const schema = schemaScanner(html);
  const content = contentAnalyzer(html);
  const tech = await technicalSeoScanner(origin);

  return {
    url: targetUrl, finalUrl: page.finalUrl, statusCode: page.status, loadMs: page.ms, ok: page.ok,
    https: u.protocol === "https:",
    ...meta, ...headings, ...images, ...links, ...schema, ...content,
    robotsTxt: tech.robotsTxt, sitemap: tech.sitemap,
    htmlBytes: html.length,
  };
}
