/**
 * Browser Studio — server-side page inspection.
 *
 * A fast, on-page inspection that REUSES the SEO Audit scanners + SSRF guard.
 * It fetches the target HTML once (SSRF-safe, re-validating every redirect),
 * runs the pure HTML scanners, extracts Open Graph + search-snippet + basic
 * accessibility signals, and returns a structured report with a score + issues.
 *
 * For a deep audit (robots/sitemap/technical/link-status), the workspace hands
 * off to the existing SEO Audit tool — this stays light so the UI is snappy.
 */
import "server-only";
import { validateAuditUrl } from "@/lib/seo-audit/ssrf";
import {
  metadataScanner, headingScanner, imageSeoScanner, linkScanner, schemaScanner, contentAnalyzer,
} from "@/lib/seo-audit/scanners";
import type { InspectionReport, InspectionIssue, OgPreview } from "./types";

const UA = "Mozilla/5.0 (compatible; CreatorsForgeBrowserStudio/1.0; +https://www.creatorsforge.io)";
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 5;

const attr = (tag: string, name: string) => new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag)?.[1] ?? null;

/** SSRF-safe fetch: re-validates every redirect hop (a public host can 3xx to a
 *  private/metadata address). Caller must validate the initial URL first. */
async function safeFetchHtml(url: string): Promise<{ ok: boolean; status: number; html: string; ms: number; finalUrl: string }> {
  const started = Date.now();
  let current = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(current, { signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" }, redirect: "manual" });
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location");
          if (!loc) return { ok: false, status: res.status, html: "", ms: Date.now() - started, finalUrl: current };
          const next = new URL(loc, current).toString();
          const check = await validateAuditUrl(next);
          if (!check.ok) return { ok: false, status: 0, html: "", ms: Date.now() - started, finalUrl: current };
          current = next;
          continue;
        }
        const raw = await res.text();
        return { ok: res.ok, status: res.status, html: raw.slice(0, MAX_BYTES), ms: Date.now() - started, finalUrl: res.url || current };
      } finally { clearTimeout(t); }
    }
    return { ok: false, status: 0, html: "", ms: Date.now() - started, finalUrl: current };
  } catch {
    return { ok: false, status: 0, html: "", ms: Date.now() - started, finalUrl: current };
  }
}

function extractOg(html: string): OgPreview {
  const og: OgPreview = {};
  for (const m of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const prop = (attr(m, "property") ?? attr(m, "name") ?? "").toLowerCase();
    const content = attr(m, "content") ?? undefined;
    if (!content) continue;
    if (prop === "og:title") og.title = content;
    else if (prop === "og:description") og.description = content;
    else if (prop === "og:image") og.image = content;
    else if (prop === "og:type") og.type = content;
    else if (prop === "og:url") og.url = content;
    else if (prop === "og:site_name") og.siteName = content;
    else if (prop === "twitter:title" && !og.title) og.title = content;
    else if (prop === "twitter:description" && !og.description) og.description = content;
    else if (prop === "twitter:image" && !og.image) og.image = content;
  }
  return og;
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; }

/** Inspect a URL. Never throws — returns a report with `error` set on failure. */
export async function inspectUrl(rawUrl: string): Promise<InspectionReport> {
  const empty = (error: string, url = rawUrl): InspectionReport => ({
    url, finalUrl: url, ok: false, status: 0, loadMs: 0, score: 0,
    meta: { title: null, titleLength: 0, metaDescription: null, metaDescriptionLength: 0, canonical: null, robotsMeta: null, viewport: false, lang: null, ogTags: 0 },
    headings: { h1: [], h2Count: 0, h3Count: 0 }, images: { imageCount: 0, imagesMissingAlt: 0 },
    links: { internalLinks: 0, externalLinks: 0 }, schema: { schemaTypes: [], hasJsonLd: false },
    content: { wordCount: 0, textRatio: 0 }, accessibility: { htmlLang: false, imagesMissingAlt: 0, hasViewport: false, h1Count: 0 },
    og: {}, snippet: { title: "", url, description: "" }, issues: [], error,
  });

  const check = await validateAuditUrl(rawUrl);
  if (!check.ok) return empty(check.error);
  const url = check.url.toString();
  const origin = check.url.origin;

  const r = await safeFetchHtml(url);
  if (!r.ok || !r.html) return { ...empty(`Couldn't load the page (status ${r.status || "no response"}).`, url), status: r.status, finalUrl: r.finalUrl, loadMs: r.ms };

  const meta = metadataScanner(r.html);
  const headings = headingScanner(r.html);
  const images = imageSeoScanner(r.html);
  const links = linkScanner(r.html, origin);
  const schema = schemaScanner(r.html);
  const content = contentAnalyzer(r.html);
  const og = extractOg(r.html);

  // Issues (critical/warning/passed) — a compact SEO + accessibility checklist.
  const issues: InspectionIssue[] = [];
  const add = (sev: InspectionIssue["severity"], label: string, detail?: string) => issues.push({ severity: sev, label, detail });

  if (!meta.title) add("critical", "Missing <title>", "Every page needs a unique, descriptive title.");
  else if (meta.titleLength < 30 || meta.titleLength > 65) add("warning", "Title length", `Title is ${meta.titleLength} chars — aim for 30–65.`);
  else add("passed", "Title present and well-sized");

  if (!meta.metaDescription) add("critical", "Missing meta description", "Add a 120–160 char summary for search results.");
  else if (meta.metaDescriptionLength < 70 || meta.metaDescriptionLength > 165) add("warning", "Meta description length", `${meta.metaDescriptionLength} chars — aim for 120–160.`);
  else add("passed", "Meta description present and well-sized");

  if (headings.h1.length === 0) add("critical", "No H1 heading", "Add exactly one H1 that describes the page.");
  else if (headings.h1.length > 1) add("warning", "Multiple H1s", `Found ${headings.h1.length} H1s — use one.`);
  else add("passed", "Single clear H1");

  if (images.imagesMissingAlt > 0) add("warning", "Images missing alt text", `${images.imagesMissingAlt} of ${images.imageCount} images have no alt — hurts SEO and accessibility.`);
  else if (images.imageCount > 0) add("passed", "All images have alt text");

  if (!meta.canonical) add("warning", "No canonical URL", "Add a canonical link to avoid duplicate-content issues.");
  else add("passed", "Canonical URL set");

  if (!meta.viewport) add("critical", "No viewport meta", "Required for mobile responsiveness.");
  else add("passed", "Mobile viewport set");

  if (!meta.lang) add("warning", "No <html lang>", "Set a language for accessibility and search.");
  else add("passed", "Language declared");

  if (!schema.hasJsonLd) add("warning", "No structured data (JSON-LD)", "Add schema.org markup for rich results.");
  else add("passed", `Structured data: ${schema.schemaTypes.join(", ") || "present"}`);

  if (content.wordCount < 300) add("warning", "Thin content", `~${content.wordCount} words — thin pages rank poorly.`);
  else add("passed", `Content depth (~${content.wordCount} words)`);

  // Simple score: start 100, −12 per critical, −5 per warning, floor 0.
  const crit = issues.filter((i) => i.severity === "critical").length;
  const warn = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, Math.min(100, 100 - crit * 12 - warn * 5));

  return {
    url, finalUrl: r.finalUrl, ok: true, status: r.status, loadMs: r.ms, score,
    meta, headings, images, links, schema, content,
    accessibility: { htmlLang: !!meta.lang, imagesMissingAlt: images.imagesMissingAlt, hasViewport: meta.viewport, h1Count: headings.h1.length },
    og,
    snippet: { title: truncate(meta.title ?? "(no title)", 60), url, description: truncate(meta.metaDescription ?? "(no meta description — search engines will guess from page content)", 160) },
    issues,
  };
}

/** Compact page context for the AI assistant (kept small to control tokens). */
export function reportToContext(report: InspectionReport): string {
  return [
    `URL: ${report.url}`,
    `Title: ${report.meta.title ?? "(none)"}`,
    `Meta description: ${report.meta.metaDescription ?? "(none)"}`,
    `H1: ${report.headings.h1.join(" | ") || "(none)"}`,
    `H2 count: ${report.headings.h2Count}, words: ${report.content.wordCount}`,
    `Images: ${report.images.imageCount} (${report.images.imagesMissingAlt} missing alt)`,
    `Links: ${report.links.internalLinks} internal / ${report.links.externalLinks} external`,
    `Schema: ${report.schema.schemaTypes.join(", ") || "none"}`,
    `SEO score: ${report.score}/100`,
    `Top issues: ${report.issues.filter((i) => i.severity !== "passed").slice(0, 8).map((i) => i.label).join("; ") || "none"}`,
  ].join("\n");
}
