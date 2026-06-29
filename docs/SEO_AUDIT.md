# SEO Audit Tool (under AI SEO Studio)

Users enter a website URL and get a full SEO audit — scores, issues, a prioritized
fix plan, and AI content recommendations — at `/dashboard/seo/audit`.

## Feature summary

Modular scanner engine fetches the page (+ robots.txt + first sitemap), extracts
metadata/headings/images/links/schema/content signals, computes 0–100 scores
deterministically, and an AI layer adds an executive summary, prioritized
recommendations, and recommended content. A separate Fix Plan generates
step-by-step fixes, WordPress plugins, internal-linking and metadata rewrites.

## Pages added

- `/dashboard/seo/audit` — the audit tool (form → progress → report → fix plan).
- `/admin/seo-audit` — admin usage analytics.

## Dashboard / placement updates

- Added **SEO Audit** to the AI SEO Studio category group (Create Hub, SEO studio,
  dashboard, template gallery) with route `/dashboard/seo/audit`.
- Homepage **tool pills** ("SEO Audit") and **footer** ("SEO Website Audit Tool",
  SEO Tools column). Footer/tool-pill slugs redirect to the audit via a SLUG_ALIASES
  map in the create-category page.
- Admin nav gains "SEO Audit".

## Database migrations (`0014_seo_audit.sql`)

`seo_audits`, `seo_audit_pages`, `seo_audit_issues`, `seo_audit_scores`,
`seo_audit_recommendations`, `seo_audit_reports`, `seo_audit_fix_plans` — owner-only
RLS (child tables scoped through the parent audit).

## API routes

`/api/seo-audit/start` (validate + scan + score + AI + persist + charge),
`/status`, `/report`, `/fix-plan` (25 cr), `/history`, `/download-pdf` (5 cr);
admin `/api/admin/seo-audit/stats`.

## Credit pricing

Quick 25 · Full 100 · WordPress 75 · Ecommerce 120 · Blog 60 · Fix Plan 25 ·
PDF 5. Estimated cost is shown before starting; insufficient balance returns 402
with a Top Up prompt. Audit credits are charged on successful completion only.

## Audit report structure

Executive summary; 7 scores (overall, technical, content, performance, mobile,
indexing, ranking) with green/yellow/red badges; metadata & structure snapshot;
grouped issues (critical/warning/passed) with fixes; AI recommendations;
recommended content (→ "Generate SEO Content From This Audit" links to the SEO
article generator); optional AI fix plan.

## Modular engine (`src/lib/seo-audit/`)

`scanners.ts` (metadataScanner, headingScanner, imageSeoScanner, linkScanner,
robotsScanner, sitemapScanner, schemaScanner, contentAnalyzer, performanceScanner,
technicalSeoScanner, runScan), `scoring.ts`, `ai.ts` (aiRecommendationEngine:
analysis + fix plan; Claude or deterministic placeholder), `engine.ts`
(orchestrator), `ssrf.ts` (URL guard), `types.ts`.

## UI components (`src/components/seo-audit/`)

SEOAuditForm, SEOAuditTypeSelector, SEOAuditScoreCard, SEOAuditProgress,
SEOAuditReport, SEOIssueTable, SEORecommendationCard, SEOFixPlan, SEOAuditHistory,
SEOAuditPDFButton, plus the SeoAudit orchestrator.

## Security review

- **SSRF guard** (`ssrf.ts`): only public http(s) on standard ports; blocks
  localhost/.local, literal private/loopback/link-local/CGNAT/multicast IPs, and
  resolves the hostname to reject domains pointing at private addresses.
- **Timeouts** (12s page, 8s robots/sitemap) + 1.5 MB read cap; only 3 requests
  per audit (page + robots.txt + first sitemap) — no aggressive crawling; a
  descriptive User-Agent is sent.
- Rate limited (6 audits/min, 10 fix-plans/min). Owner-only RLS on all tables.
- Credits deducted server-side only. Server logs/errors captured via
  `captureError`, never returned to the user.

## Testing results

`npm run build` compiles all routes/components. The scan is real (no AI key
needed) so scores/issues/report work immediately; AI recommendations and fix
plans use Claude when `ANTHROPIC_API_KEY` is set, otherwise a deterministic
fallback. Try a public URL; private/local URLs are rejected by the SSRF guard.

## Known limitations & future improvements

- Single-page scan (the entered URL); multi-page crawl would deepen the audit.
- Performance is heuristic (page weight + TTFB), not Lighthouse/Core Web Vitals —
  integrating PageSpeed Insights API is the natural upgrade.
- PDF uses the browser's print-to-PDF; a server-rendered PDF could be added.
- Broken-link checking currently flags counts, not per-link HTTP status (would
  require additional fetches); add a bounded link checker next.
- Connect recommended content directly into the SEO generator with prefilled topics.
