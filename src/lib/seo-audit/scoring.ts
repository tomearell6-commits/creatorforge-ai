/**
 * Deterministic scoring + issue derivation from a ScanResult. Scores are 0–100;
 * each sub-score starts at 100 and loses points per problem. Issues record
 * critical/warning/passed checks for the report.
 */
import type { ScanResult, Scores, AuditIssue } from "./types";

export function computeScoresAndIssues(s: ScanResult): { scores: Scores; issues: AuditIssue[] } {
  const issues: AuditIssue[] = [];
  const add = (issue_type: AuditIssue["issue_type"], severity: AuditIssue["severity"], title: string, description: string, fix: string) =>
    issues.push({ issue_type, severity, title, description, recommended_fix: fix, affected_url: s.finalUrl });

  let technical = 100, content = 100, performance = 100, mobile = 100, indexing = 100;

  // --- Reachability ---
  if (!s.ok) { technical -= 40; add("technical", "critical", "Page did not return 200", `The page returned status ${s.statusCode || "no response"}.`, "Ensure the URL is publicly reachable and returns HTTP 200."); }
  else add("technical", "passed", "Page reachable", "The page returned a successful response.", "");

  // --- HTTPS ---
  if (!s.https) { technical -= 15; add("technical", "critical", "Not served over HTTPS", "The page is not using a secure connection.", "Install an SSL certificate and force HTTPS."); }
  else add("technical", "passed", "HTTPS enabled", "The site uses a secure connection.", "");

  // --- Title ---
  if (!s.title) { content -= 20; add("onpage", "critical", "Missing <title>", "No title tag was found.", "Add a unique, descriptive <title> (50–60 characters)."); }
  else if (s.titleLength < 30 || s.titleLength > 65) { content -= 8; add("onpage", "warning", "Title length not optimal", `Title is ${s.titleLength} characters.`, "Aim for 50–60 characters with the primary keyword near the front."); }
  else add("onpage", "passed", "Title present & sized well", "Title tag looks good.", "");

  // --- Meta description ---
  if (!s.metaDescription) { content -= 12; add("onpage", "warning", "Missing meta description", "No meta description was found.", "Add a 140–160 character meta description with the target keyword."); }
  else if (s.metaDescriptionLength < 80 || s.metaDescriptionLength > 165) { content -= 5; add("onpage", "warning", "Meta description length", `Meta description is ${s.metaDescriptionLength} characters.`, "Aim for 140–160 characters."); }
  else add("onpage", "passed", "Meta description present", "Meta description looks good.", "");

  // --- Headings ---
  if (s.h1.length === 0) { content -= 12; add("content", "critical", "No H1 heading", "The page has no H1.", "Add a single descriptive H1 with the primary keyword."); }
  else if (s.h1.length > 1) { content -= 6; add("content", "warning", "Multiple H1 headings", `Found ${s.h1.length} H1 tags.`, "Use exactly one H1 per page."); }
  else add("content", "passed", "Single H1 present", "Heading structure starts correctly.", "");
  if (s.h2Count === 0 && s.wordCount > 300) { content -= 5; add("content", "warning", "No subheadings", "Long content without H2 subheadings.", "Break content into sections with H2/H3 headings."); }

  // --- Images ---
  if (s.imageCount > 0 && s.imagesMissingAlt > 0) { const pct = s.imagesMissingAlt / s.imageCount; content -= Math.round(pct * 12); add("images", pct > 0.5 ? "critical" : "warning", "Images missing alt text", `${s.imagesMissingAlt} of ${s.imageCount} images lack alt text.`, "Add descriptive alt text to every meaningful image."); }
  else if (s.imageCount > 0) add("images", "passed", "Images have alt text", "All images include alt attributes.", "");

  // --- Content depth ---
  if (s.wordCount < 300) { content -= 10; add("content", "warning", "Thin content", `Only ~${s.wordCount} words detected.`, "Expand to 600+ words of useful, original content."); }
  else add("content", "passed", "Sufficient content length", `~${s.wordCount} words.`, "");

  // --- Links ---
  if (s.internalLinks < 3) { content -= 5; add("links", "warning", "Few internal links", `Only ${s.internalLinks} internal links found.`, "Add contextual internal links to related pages."); }
  else add("links", "passed", "Internal linking present", `${s.internalLinks} internal links.`, "");

  // --- Indexing: robots, sitemap, canonical, robots meta ---
  if (s.robotsMeta && /noindex/i.test(s.robotsMeta)) { indexing -= 50; add("indexing", "critical", "Page set to noindex", "A robots meta tag blocks indexing.", "Remove 'noindex' unless this page should be hidden from search."); }
  if (s.robotsTxt.blocksAll) { indexing -= 30; add("indexing", "critical", "robots.txt blocks crawling", "robots.txt disallows all crawlers.", "Allow search engines to crawl indexable pages."); }
  if (!s.robotsTxt.found) { indexing -= 8; add("technical", "warning", "No robots.txt", "robots.txt was not found.", "Add a robots.txt that points to your sitemap."); }
  else add("technical", "passed", "robots.txt found", "robots.txt is present.", "");
  if (!s.sitemap.found) { indexing -= 12; add("indexing", "warning", "No XML sitemap", "No sitemap was found.", "Generate and submit an XML sitemap (e.g. /sitemap.xml)."); }
  else add("indexing", "passed", "Sitemap found", `Sitemap with ${s.sitemap.urlCount} URLs.`, "");
  if (!s.canonical) { indexing -= 5; add("indexing", "warning", "No canonical tag", "No canonical URL is declared.", "Add a self-referencing canonical link."); }

  // --- Schema ---
  if (!s.hasJsonLd && s.schemaTypes.length === 0) { technical -= 8; add("schema", "warning", "No structured data", "No JSON-LD or microdata schema detected.", "Add relevant schema.org markup (Article, Product, FAQ, etc.)."); }
  else add("schema", "passed", "Structured data present", `Schema: ${s.schemaTypes.join(", ") || "JSON-LD"}.`, "");

  // --- Mobile ---
  if (!s.viewport) { mobile -= 40; add("mobile", "critical", "No viewport meta", "The page has no responsive viewport tag.", "Add <meta name=viewport content='width=device-width, initial-scale=1'>."); }
  else add("mobile", "passed", "Responsive viewport set", "Viewport meta tag is present.", "");
  if (!s.lang) { mobile -= 5; add("technical", "warning", "No lang attribute", "<html> has no lang attribute.", "Set <html lang> for accessibility and i18n."); }

  // --- Performance (page weight + load time heuristic) ---
  if (s.htmlBytes > 500_000) { performance -= 20; add("performance", "warning", "Large HTML payload", `HTML is ~${Math.round(s.htmlBytes / 1024)} KB.`, "Reduce inline scripts/markup; lazy-load and compress."); }
  if (s.loadMs > 3000) { performance -= 25; add("performance", "critical", "Slow response", `Fetched in ${s.loadMs} ms.`, "Improve TTFB: caching/CDN, optimize server and assets."); }
  else if (s.loadMs > 1500) { performance -= 10; add("performance", "warning", "Moderate response time", `Fetched in ${s.loadMs} ms.`, "Consider a CDN and better caching."); }
  else add("performance", "passed", "Fast response", `Fetched in ${s.loadMs} ms.`, "");

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  technical = clamp(technical); content = clamp(content); performance = clamp(performance);
  mobile = clamp(mobile); indexing = clamp(indexing);
  const ranking = clamp(content * 0.4 + technical * 0.25 + indexing * 0.2 + performance * 0.15);
  const overall = clamp(technical * 0.25 + content * 0.3 + performance * 0.15 + mobile * 0.1 + indexing * 0.2);

  return { scores: { overall, technical, content, performance, mobile, indexing, ranking }, issues };
}
