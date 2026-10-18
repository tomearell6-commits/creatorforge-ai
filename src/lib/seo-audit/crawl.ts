import "server-only";
import { fetchText, metadataScanner, headingScanner, imageSeoScanner, linkScanner, schemaScanner, contentAnalyzer } from "./scanners";
import { validateAuditUrl } from "./ssrf";
import {
  ESSENTIALS, analyseFooter, detectEssentials, findDuplicates, findTrust, looksLikeShop, matchesEssential,
  type PageLink, type PageScan, type SiteScan,
} from "./site";

/**
 * Reads up to 25 pages of one website (the home page, the pages its menus and footer point to, the
 * pages that look like essential pages, and a sample of the sitemap) and turns them into a SiteScan.
 * Only the same website is ever fetched; every fetch goes through the same SSRF guard as the audit.
 */
const MAX_PAGES = 25;
const CONCURRENCY = 5;
const BUDGET_MS = 45_000;
const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|ico|css|js|zip|mp3|mp4|xml|json|txt|woff2?)(\?|$)/i;

const strip = (h: string) => h.toLowerCase().replace(/^www\./, "");
const visible = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&#x27;/g, "'").replace(/&quot;/g, '"');

function normalizeUrl(href: string, base: string, host: string): string | null {
  try {
    if (/^(mailto:|tel:|javascript:|#)/i.test(href.trim())) return null;
    const u = new URL(href, base);
    if (!/^https?:$/.test(u.protocol) || strip(u.hostname) !== host || SKIP_EXT.test(u.pathname)) return null;
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(k)) u.searchParams.delete(k);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.host}${path}${u.search}`;
  } catch { return null; }
}

function footerHtml(html: string): string | null {
  const blocks = html.match(/<footer\b[\s\S]*?<\/footer>/gi);
  return blocks && blocks.length ? blocks.join("\n") : null;
}

/** Links on a page with their text, flagged when they sit inside the footer. */
export function extractLinks(html: string, base: string, host: string): PageLink[] {
  const footers: [number, number][] = [];
  for (const m of html.matchAll(/<footer\b[\s\S]*?<\/footer>/gi)) footers.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  const out: PageLink[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = normalizeUrl(decode(m[1]), base, host);
    if (!href) continue;
    const at = m.index ?? 0;
    out.push({ href, text: decode(visible(m[2])).slice(0, 80), inFooter: footers.some(([a, b]) => at >= a && at <= b) });
  }
  return out;
}

async function sitemapUrls(origin: string, host: string): Promise<string[]> {
  const found: string[] = [];
  const queue: string[] = [];
  const robots = await fetchText(`${origin}/robots.txt`, 6000);
  if (robots.ok) for (const m of robots.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)) queue.push(m[1]);
  if (queue.length === 0) queue.push(`${origin}/sitemap.xml`);
  let fetched = 0;
  while (queue.length && fetched < 4 && found.length < 300) {
    const sm = queue.shift()!;
    fetched++;
    const r = await fetchText(sm, 8000);
    if (!r.ok) continue;
    for (const m of r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const u = decode(m[1]);
      if (/\.xml(\?|$)/i.test(u) && queue.length < 3) { queue.push(u); continue; } // a sitemap index: read its first few children
      const n = normalizeUrl(u, origin, host);
      if (n) found.push(n);
    }
  }
  return found;
}

/** Choose which pages to read: home, essential-looking pages, menu/footer targets, then an even sample of the sitemap. */
export function pickUrls(home: string, homeLinks: PageLink[], sitemap: string[], host: string, max = MAX_PAGES): string[] {
  const order: string[] = [];
  const add = (u: string | null) => { if (u && !order.includes(u) && order.length < max) order.push(u); };
  add(home);
  const all = [...homeLinks.map((l) => ({ href: l.href, text: l.text })), ...sitemap.map((u) => ({ href: u, text: "" }))];
  for (const e of ESSENTIALS) for (const c of all) if (matchesEssential(e.id, c.href, c.text)) { add(c.href); break; }
  for (const l of homeLinks.filter((x) => x.inFooter)) add(l.href);
  for (const l of homeLinks) add(l.href);
  const rest = sitemap.filter((u) => !order.includes(u));
  const step = Math.max(1, Math.floor(rest.length / Math.max(1, max - order.length)));
  for (let i = 0; i < rest.length && order.length < max; i += step) add(rest[i]);
  return order.filter((u) => { try { return strip(new URL(u).hostname) === host; } catch { return false; } });
}

function scanPage(url: string, status: number, html: string): PageScan {
  const meta = metadataScanner(html);
  const h = headingScanner(html);
  const img = imageSeoScanner(html);
  const links = linkScanner(html, new URL(url).origin);
  const schema = schemaScanner(html);
  const content = contentAnalyzer(html);
  return {
    url, status, title: meta.title, metaDescription: meta.metaDescription, h1Count: h.h1.length, words: content.wordCount,
    imageCount: img.imageCount, imagesMissingAlt: img.imagesMissingAlt, internalLinks: links.internalLinks,
    schemaTypes: schema.schemaTypes, canonical: meta.canonical, noindex: !!meta.robotsMeta && /noindex/i.test(meta.robotsMeta),
    snippet: visible(html).slice(0, 500),
  };
}

export async function crawlSite(startUrl: string): Promise<SiteScan> {
  const started = Date.now();
  const u = new URL(startUrl);
  const origin = u.origin;
  const host = strip(u.hostname);

  const home = await fetchText(startUrl);
  const homeHtml = home.text;
  const homeLinks = extractLinks(homeHtml, home.finalUrl || startUrl, host);
  const sitemap = await sitemapUrls(origin, host);
  const urls = pickUrls(normalizeUrl(startUrl, origin, host) ?? startUrl, homeLinks, sitemap, host);

  const pages: PageScan[] = [];
  const allLinks: PageLink[] = [...homeLinks];
  const texts: string[] = [visible(homeHtml)];
  const htmlByUrl = new Map<string, string>();
  const queue = urls.filter((x) => x !== (normalizeUrl(startUrl, origin, host) ?? startUrl));
  // The home page is already fetched.
  pages.push(scanPage(home.finalUrl || startUrl, home.status, homeHtml));
  htmlByUrl.set(pages[0].url, homeHtml);

  async function worker() {
    while (queue.length && Date.now() - started < BUDGET_MS) {
      const url = queue.shift()!;
      const check = await validateAuditUrl(url);
      if (!check.ok) continue;
      const r = await fetchText(url, 9000);
      const scan = scanPage(r.finalUrl || url, r.status, r.text);
      pages.push(scan);
      if (r.ok) {
        htmlByUrl.set(scan.url, r.text);
        texts.push(visible(r.text));
        if (pages.length <= 6) allLinks.push(...extractLinks(r.text, r.finalUrl || url, host));
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const okPages = pages.filter((p) => p.status === 200);
  const homeText = visible(homeHtml);
  const allText = texts.join(" ");
  const isShop = looksLikeShop(allText, urls);
  const essentials = detectEssentials(pages, homeLinks, isShop);
  const footer = analyseFooter(footerHtml(homeHtml), homeLinks, essentials);

  // Contact details can sit on the contact page rather than the home page.
  const contactUrl = essentials.find((e) => e.id === "contact")?.url;
  const trustText = homeText + " " + (contactUrl && htmlByUrl.has(contactUrl) ? visible(htmlByUrl.get(contactUrl)!) : "") + " " + (footerHtml(homeHtml) ?? "").replace(/<[^>]+>/g, " ");
  const trust = findTrust(trustText);

  // Internal links we never fetched: check a small sample for broken ones.
  const seen = new Set(pages.map((p) => p.url));
  const unchecked = [...new Set(allLinks.map((l) => l.href))].filter((l) => !seen.has(l)).slice(0, 10);
  const brokenLinks: string[] = [];
  if (Date.now() - started < BUDGET_MS) {
    await Promise.all(unchecked.map(async (l) => {
      const check = await validateAuditUrl(l);
      if (!check.ok) return;
      const r = await fetchText(l, 6000);
      if (r.status === 404 || r.status === 410 || r.status >= 500) brokenLinks.push(l);
    }));
  }

  const titleBad = (p: PageScan) => !!p.title && (p.title.length < 30 || p.title.length > 65);
  const homePage = pages[0];
  return {
    origin, host, pagesCrawled: pages.length, pagesDiscovered: Math.max(urls.length, sitemap.length),
    pages, isShop, lang: metadataScanner(homeHtml).lang,
    essentials, footer, trust,
    duplicateTitles: findDuplicates(okPages, (p) => p.title),
    duplicateDescriptions: findDuplicates(okPages, (p) => p.metaDescription),
    missingDescriptions: okPages.filter((p) => !p.metaDescription).map((p) => p.url),
    missingH1: okPages.filter((p) => p.h1Count === 0).map((p) => p.url),
    thinPages: okPages.filter((p) => p.words < 300).map((p) => p.url),
    badTitleLength: okPages.filter(titleBad).map((p) => p.url),
    imagesMissingAlt: okPages.reduce((n, p) => n + p.imagesMissingAlt, 0),
    schemaOnHome: homePage.schemaTypes, brokenLinks,
    homeTitle: homePage.title, homeDescription: homePage.metaDescription, homeText: homeText.slice(0, 3000),
  };
}
