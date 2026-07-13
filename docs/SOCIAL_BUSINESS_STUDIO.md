# Social Business Studio

A multi-platform social management workspace — connect, optimize, create,
schedule, publish, organize enquiries, reply, and analyze across major social
platforms. **Not a growth/ranking product**: no follower or ranking guarantees,
and no post/reply is ever reported as done unless the provider confirms it.

## 1. Summary

One workspace over 12 platforms (Facebook, Instagram, LinkedIn, TikTok, YouTube,
YouTube Shorts, Pinterest, X, Threads, Google Business, WordPress, Brevo). Reuses
the platform's existing `social_accounts` + OAuth + publishing engine + Design
(images) + Video (Shotstack) + Email/Ads + credits + notifications + admin.

## 2. Pages & routes (15)

`/dashboard/grow/social-business` (Overview) · `/accounts` · `/profile-optimization`
· `/content` · `/images` · `/videos` · `/campaigns` · `/calendar` · `/publishing`
· `/inbox` · `/replies` · `/analytics` · `/reports` · `/automation` · `/settings`.
Public landing `/tools/social-business-studio`. Admin `/admin/social-business`.
Nav: Marketing Studio → Social Business Studio, Integrations → Social Accounts,
footer "Social Business Studio".

## 3. Connected accounts architecture

Reuses `social_accounts` (Phase 6) + `lib/publishing/oauth.ts`. Official OAuth per
platform; tokens encrypted, never sent to the client. Connect via `/api/social`;
capability + connection status surfaced by `/api/social-business/capabilities`.

## 4. Provider capability matrix

`config/socialProviderCapabilities.ts` — each provider defines per-capability
levels (Supported / Limited / Manual / Not-available) for content, publishing,
scheduling, analytics, inbox, comments, ads, profile-editing, plus token refresh,
required permissions, and known limits. The UI reads this to disable unsupported
actions. Today only WordPress is a live publisher; the rest are Manual until each
platform's app is approved.

## 5. Profile optimization

`/api/social-business/profile/optimize` — evaluates a platform profile → Profile
Health Score + missing info + AI bio/description/CTA + brand notes. Not a ranking
score. Credit-metered (10).

## 6. AI content generation

`lib/social/content.ts` — one idea → DISTINCT per-platform variations (headline,
caption, body, CTA, hashtags, image/video prompt, format, suggested time, a11y
text, compliance notes). Never identical copy. `/content/generate` +
`/content/variations`. 15 content types in `config/socialContentCapabilities.ts`.

## 7. AI image & video integration

Images reuse the Design Studio FLUX engine (`/images/generate`, original assets
only). Video is a Video Studio hand-off that preserves platforms/campaign/schedule.

## 8. Multi-platform campaign workflow

`/campaigns` (POST) builds a campaign + content project + per-platform variations +
campaign items, credit-metered (12). The CampaignWizard shows a per-platform
review where each platform is edited and published/scheduled **independently**.

## 9. Publishing & scheduling

`lib/social/publish.ts` `runSocialPublish` — per-platform INDEPENDENT tracking in
`social_publish_jobs` + events. Live providers publish for real; not-yet-approved
providers return an honest "unavailable" and are never marked published. Queue +
Calendar via `/publish/status`.

## 10. Inbox & Reply Assistant

`/inbox` classifies items (urgent/sales lead/support/partnership/complaint/general/
spam); manual add until provider inbox APIs are approved. `/replies/draft` drafts
in tone with SAFETY: high-risk (legal/refund/dispute/complaint/financial/security/
urgent) flagged for manual approval, never auto-sent, no compensation promises.

## 11. Cross-platform analytics

`/analytics` — our own data live (posts, scheduled, campaigns, variations,
replies); platform metrics marked unavailable until each provider's analytics API
is approved. Never fabricated.

## 12. Credit model

Charged: content 5 + 2/platform, image 5, video 30, campaign 12, reply 2, report
15, profile optimize 10. Free: connecting, manual editing, viewing analytics/
history, manual scheduling, disconnecting. Estimate shown first; insufficient
credits pause and preserve work.

## 13. Subscription access

Starter (limited accounts, manual) · Professional (more accounts, AI content,
scheduling, images) · Business (multi-platform campaigns, video, inbox/replies,
automation) · Enterprise (agency workspaces, higher limits, white-label). Locked
features show an Upgrade button.

## 14. Database migrations

`0042_social_business.sql` — 17 new `social_*` tables (profiles, profile_audits,
content_projects + variations, media_assets, campaigns + items, publish_jobs +
events, schedules, inbox_items, reply_drafts, analytics, reports, automation_rules,
account_permissions, connection_logs). Reuses existing `social_accounts`. Owner-RLS
+ workspace_id.

## 15. API routes

`/api/social-business/`: capabilities, content/generate, content/variations,
images/generate, profile/optimize, campaigns, publish, schedule, publish/status,
inbox, replies/draft, analytics, reports, automation. Accounts reuse `/api/social`.
Admin: `/api/admin/social-business/stats`.

## 16. Admin controls

`/admin/social-business` (requireAdmin) — aggregate usage (projects, variations,
campaigns, publish jobs, failed jobs, reply drafts, reports). **No private messages
or content** unless explicit, logged support access is granted.

## 17. Security

Official OAuth; encrypted tokens never on the client; owner + workspace RLS on all
17 tables; `auth.getUser()` on every route; connection logging; publish verified
before "published"; sanitized inputs; no raw passwords.

## 18. Accessibility

Labelled selects/inputs, keyboard-navigable, status/capability badges use icon +
text (not colour alone), responsive editors and previews, focus-visible states.

## 19. End-to-end testing status

`tsc --noEmit` 0 errors + `next lint` clean on every commit; Vercel build green
each push. Verified: capabilities + connect (honest gated), content → distinct
per-platform variations + inline image, profile optimize, campaign build →
per-platform independent publish/schedule (honest unavailable), inbox classify +
reply with safety flag, analytics (honest gated), report, automation rule.

## 20. Known provider limitations

Live posting/reading on Meta, Instagram, LinkedIn, TikTok, YouTube, Pinterest, X,
Threads each requires that platform's approved developer app (Meta business
verification, LinkedIn Marketing Developer Platform, TikTok Content Posting API, X
paid tier, etc.). No official trend-data API for TikTok — trend tools are planning
aids. Until approved, those providers are Manual (prepare + export), clearly
labelled, never simulated.

## 21. Remaining technical debt

- Automation cron to fire assisted/autopilot posts is minimal until live providers
  exist. Drag-and-drop calendar rescheduling and per-provider inbox sync land with
  each approved provider.
- Video is a hand-off (renders in Video Studio) rather than inline.
- Threads/X publishing depend on API tier/approval.

## 22. Production-readiness

**Ship-ready today** as a multi-platform content, campaign, profile, inbox, and
planning workspace with honest, per-platform gated publishing. Each platform's
live posting/analytics switches on when you register its app and pass review. No
follower/ranking promises, no simulated actions — safe to expose to customers now.
