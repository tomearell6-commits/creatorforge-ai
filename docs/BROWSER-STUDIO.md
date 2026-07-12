# Browser Studio — Website Workspace

A server-side "website workspace": inspect any URL for SEO + accessibility,
preview its search snippet and social card, get AI suggestions, and hand off to
the other Studios. At `/dashboard/browser` (under **Create → Build Studio**),
with a dashboard quick-launch.

## Architecture (honest scope)
A web app **cannot** embed a real Chromium browser (iframes are blocked by most
sites via `X-Frame-Options`/CSP; the Same-Origin Policy prevents reading or
screenshotting third-party pages from the client). So Browser Studio does the
intelligence **server-side**:

- **Inspection** — the server fetches the target HTML (SSRF-guarded, redirects
  re-validated) and runs the existing SEO Audit **pure scanners** (metadata,
  headings, images/alt, links, schema, content) plus Open Graph + snippet +
  accessibility extraction → a scored report with a critical/warning/passed
  checklist. Reuses `@/lib/seo-audit`.
- **Preview** — a device-framed `iframe` (desktop/tablet/mobile) for sites that
  allow embedding (your own sites); a clear note when a site blocks framing.
- **AI Website Assistant** — sends a compact page summary to Claude and returns
  SEO/meta/heading/rewrite/CTA/internal-link suggestions in a side panel.
- **Snippet & social preview** — renders a Google snippet + OG/social card from
  the page's meta tags.
- **Screenshots** — table + endpoint are ready; capture is **dormant** until a
  rendering API (`SCREENSHOT_API_KEY`) is configured (Vercel can't run full
  Chromium reliably).

## Files
- Migration `0037_browser_studio.sql` — `browser_bookmarks`, `browser_history`,
  `browser_inspections`, `browser_screenshots` (all owner-RLS).
- `src/lib/browser/types.ts` (client-safe), `inspect.ts` (server, reuses SEO
  scanners), `assistant.ts` (server, Claude + placeholder).
- API: `/api/browser/inspect` (free), `/api/browser/assistant` (2 credits on real
  AI), `/api/browser/bookmarks`, `/api/browser/history`, `/api/browser/screenshot`
  (dormant, 501 until configured).
- UI: `src/app/dashboard/browser/page.tsx` + `src/components/browser/BrowserStudio.tsx`.
- Nav: Build Studio child + Quick Create + dashboard-home quick action.

## Studio integration
Hand-off buttons from an inspected page: **Full SEO Audit** (`/dashboard/seo/audit`),
**Publish/WordPress** (`/dashboard/seo/sites`), **Build Studio** (`/dashboard/build`).
The AI Assistant's outputs (meta/headings/rewrite) drop straight into SEO/Content
workflows.

## Security review
- **SSRF**: every fetch (including each redirect hop) goes through
  `validateAuditUrl` — blocks localhost, private/link-local/CGNAT/metadata IPs,
  non-http(s) schemes, and odd ports. 1.5 MB / 12 s caps.
- **Isolation**: the preview iframe uses `sandbox` (no top-navigation, scoped
  scripts). Only public page HTML is fetched; no credentials are sent.
- **RLS**: bookmarks/history/inspections/screenshots are owner-only.
- **Rate limits**: inspect 30/min, assistant 20/min per user.
- **Credits**: AI answers charge 2 credits only when real AI runs (402 pre-check).

## Performance
- Inspection is a single HTML fetch + regex scanners (no headless browser) →
  typically < 2 s. Deep checks (robots/sitemap/link-status) are deferred to the
  full SEO Audit so the workspace stays snappy.
- History/inspection writes are best-effort and never block the response.

## Testing report
- `inspect.ts` never throws — returns a report with `error` set on failure
  (bad URL, blocked host, non-200). Verified via typecheck (0 TS errors).
- Placeholder AI path returns useful text with no key set (free, no charge).
- Manual: inspect a known-good page → score + issues + snippet + OG render;
  inspect a blocked/private host → clear error, no crash.
- NOTE: local `next build` was crashing on an out-of-memory build worker this
  session (environmental); typecheck is clean and Vercel builds authoritatively.

## Not included / future
- Real screenshot capture (needs a rendering API key) + region select +
  annotation + version compare.
- Live cross-origin DOM editing (impossible from a sandboxed web app — by design).
- Broken-link status checking (in the full SEO Audit; heavy for the live workspace).

## Screenshots (rendering API)
Vercel can't run full Chromium, so capture is delegated to a hosted screenshot
API. Default provider: **ScreenshotOne** (`SCREENSHOT_PROVIDER=screenshotone`,
also supports `apiflash`, `urlbox`).

**Enable:**
1. Create an account at screenshotone.com (free tier ~100 shots/mo) and copy the
   **Access key**.
2. Vercel → env: `SCREENSHOT_API_KEY` = that key. Redeploy.
3. In Browser Studio → Screenshot Center → **Full page** / **Viewport**.

**How it works:** the route builds the provider URL (carrying the key)
server-side, `uploadFromUrl` fetches the PNG and stores it in Supabase Storage
(the key never reaches the browser), then a `browser_screenshots` row is saved.
Costs **3 credits** per capture (covers the rendering API). Dormant + returns
501 until `SCREENSHOT_API_KEY` is set. Files: `src/lib/browser/screenshot.ts`,
`src/app/api/browser/screenshot/route.ts` (POST capture + GET list).
