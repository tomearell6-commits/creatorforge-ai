# Local Business Studio (Google Business Profile)

An AI-powered local business **optimization, publishing, audit, and management**
workspace. **Not a ranking product** — scores are "Profile Health / Local
Visibility Readiness"; we never promise Google Search or Maps rankings.

## 1. Summary

Manage Google Business Profiles: connect, multi-location, audit, optimize,
generate posts + branded images, schedule/publish (gated), draft review replies,
manage products/services, plan local content, and view available insights — all
credit-metered, all honest about what Google's API allows today.

## 2. Pages & routes (14)

`/dashboard/grow/local-business` (Overview) · `/profiles`* · `/audit` ·
`/optimizer` · `/posts` · `/images` · `/calendar` · `/publishing` · `/reviews` ·
`/products-services` · `/local-seo` · `/insights` · `/reports` · `/settings`.
Public landing: `/tools/local-business-studio`. Admin: `/admin/local-business`.
Nav: Marketing Studio → Local Business Studio, Business Studio shortcut, Manage →
Integrations → Google Business Profile, footer "Google Business Profile Manager".
(*Profiles is served by the Overview hub's locations list in this release.)

## 3. Connected account architecture

Official Google OAuth (`business.manage` scope). Tokens encrypted at rest
(`lib/security/secrets`), never sent to the client. `local_business_accounts`
stores the connection; `gbpApiConfigured()` gates all live calls. Connect returns
a real Google authorize URL when configured, and an honest "unavailable" response
otherwise — **never a simulated connection**. Disconnect deletes stored tokens.

**Environment variables (set in Vercel):** `GOOGLE_BUSINESS_CLIENT_ID`,
`GOOGLE_BUSINESS_CLIENT_SECRET`, `GOOGLE_BUSINESS_API_ENABLED=true`. OAuth
redirect URI: `https://www.creatorsforge.io/api/local-business/callback`. NOTE:
OAuth connect works once these are set; live Business Profile API reads/writes
additionally require Google's approved access to the Business Profile APIs
(separate request form — reviewed by Google).

## 4. Multi-location

`local_business_locations` (name, address, phone, website, categories,
description, hours, attributes, appointment URL, status, audit score, …), owner +
`workspace_id`. Locations can be added manually before live API access. Overview
filters by health/attention.

## 5. Audit system

`lib/local-business/audit.ts` — deterministic scoring across Completeness (0.30),
Content (0.20), Brand (0.15), Local SEO (0.20), Engagement (0.15) → weighted
Profile Health Score (0–100). Produces checks, issues, and an AI narrative
(summary + 7-day + 30-day plans + content ideas). Bands: 85+ Strong, 70+ Good,
50+ Needs improvement, <50 Critical. Quick (20 cr) / Full (60 cr).

## 6. Profile optimizer

`/optimize` — AI rewrites a section (description/services/products/appointment
CTA); returns current vs recommended + reason + priority + impact; stored as a
recommendation. **Apply manually** — no live profile writes until approved.

## 7. Post + image generation

`lib/local-business/posts.ts` — 16 post types → main/short text, CTA, offer/event,
image prompt, accessibility description, suggested time, social variations,
compliance warning. `/images/generate` reuses the Design Studio FLUX engine +
storage rehost (original assets only). Post 5 cr, post+image 20 cr, image 5 cr.

## 8. Publishing & scheduling

`/posts/schedule` (Content Calendar) and `/posts/publish` — **publish is honest**:
when the GBP API isn't approved it records `unavailable` and keeps the post a
draft; it **never marks a post published without provider confirmation**. Each
location tracked independently. Statuses: draft → awaiting_review → approved →
scheduled → publishing → published/failed/cancelled.

## 9. Review Reply Assistant

`/reviews/draft-response` — AI drafts in 6 tones. **Safety**: never auto-publishes;
negative (≤3★) and high-risk (legal/threat/discriminatory) content flagged for a
human; no compensation promises; no private info. 2 cr.

## 10. Credit model

Charged (AI only): quick audit 20, full 60, +50/extra location, description 10,
post 5, post+image 20, review reply 2, monthly plan 25, full SEO plan 40, report
15, social pack 10. Free: connect, view data/calendar/reports, manual edit,
disconnect. Estimate shown before every paid action; insufficient credits pause
and preserve work.

## 11. Database migrations

`0041_local_business.sql` — 19 tables (accounts, locations, audits, audit_checks,
audit_issues, recommendations, posts, post_assets, schedules, publish_jobs,
publish_events, products, services, reviews, review_drafts, insights, reports,
automation_rules, connection_logs). Owner-RLS + workspace_id.

## 12. API routes

`/api/local-business/`: accounts, connect, disconnect, locations, audit/start,
audit/report, optimize, posts/generate, posts/schedule, posts/publish,
posts/status, images/generate, reviews, reviews/draft-response, products,
services, local-seo, insights, reports, automation. Admin:
`/api/admin/local-business/stats`.

## 13. Admin controls

`/admin/local-business` (requireAdmin) — aggregate usage (accounts, locations,
audits, posts, images, review drafts, failed jobs) + provider-config status.
**Aggregate only — no private business content**.

## 14. Security

Official OAuth; encrypted tokens; tokens never on the client; owner + workspace
RLS on all 19 tables; `auth.getUser()` on every route; connection logging; publish
verified before "published"; disconnect deletes tokens; input validation; no raw
passwords.

## 15. Accessibility

Labelled selects/inputs, keyboard-navigable, score bars have text values (not
colour alone), status badges use icon+text, focus-visible states from the design
system.

## 16. End-to-end testing status

`tsc --noEmit` 0 errors + `next lint` clean (only pre-existing `<img>` warnings) on
every commit; Vercel production build green each push. Verified flows: connect
(honest unavailable), manual location add, audit → score + issues + plan, optimize
section, generate post + image, schedule, publish (honest gated), draft review
reply with safety flags, products/services CRUD, local SEO plan, insights (honest
gated), report.

## 17. Supported Google capabilities (today)

Official OAuth connect scaffolding. All content generation, auditing (on stored/
manual data), scheduling, and planning work now.

## 18. Known provider limitations

**Live Google Business Profile reads/writes (posts, reviews, insights, profile
edits) require Google's approved Business Profile API access** — a separate,
allowlisted application beyond OAuth. Until granted, those are gated and clearly
labelled "unavailable/manual"; nothing is simulated. Business Profile Performance
metrics (views/calls/directions) likewise need that access.

## 19. Remaining technical debt

- Automation rules exist (schema + API + modes); the visual rule builder + the
  cron that fires assisted/autopilot posts are minimal and expand once live
  publishing is available.
- Products/Services AI description generation currently reuses the Optimizer/Post
  Generator rather than an inline button.
- Guided tours + the full notification set (post-ready, reconnect-required) are
  wired at the type level; per-step emission is partial.

## 20. Production-readiness

**Ready to ship as an AI optimization/planning workspace today.** Live Google
publishing/reads flip on only after you complete the Google Cloud project + are
granted Business Profile API access (guide in Settings). No false ranking claims,
no simulated Google actions — safe to expose to customers now.
