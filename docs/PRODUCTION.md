# CreatorsForge AI — Production Readiness (Phase 8)

This document is the Phase 8 deliverable set: readiness report, security &
performance audits, test coverage, deployment/ops guides, backup, monitoring,
maintenance, and the beta launch checklist.

---

## 1. Production Readiness Report

### Architecture summary
- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind**, deployed on
  **Vercel** at `https://www.creatorsforge.io` (Cloudflare DNS, DNS-only).
- **Supabase** = Postgres + Auth (email/Google) + Storage (`media` bucket). RLS on
  every table; service-role client only in trusted server contexts (webhooks, admin).
- **Provider pattern** for AI/media/publishing — env-driven, swap placeholder ↔ real
  with no route/UI change. Real today: Claude (scripts/optimize), ElevenLabs (voice),
  OpenAI (images), Shotstack (render), **WordPress** (blog publishing).
- **Phases:** 1 foundation · 2 AI scripts+credits · 3 media engine · 4 storage/providers/
  payments/render · 5 polish · 6 publishing/analytics/automation/teams · 7 enterprise/
  admin/affiliate/referral/API/support · 8 hardening (this doc).

### Database summary
- Canonical `supabase/schema.sql` + incremental migrations `0002`–`0007`.
- ~40 tables, all with owner RLS; indexes on every FK + hot query column;
  `SECURITY DEFINER` helpers avoid policy recursion (workspaces).
- Admin/config tables (`admin_users`, `system_settings`, `billing_events`, …) have no
  permissive policy → service-role only.

### API summary
- All routes authenticate via the Supabase session; ownership re-checked per request.
- Admin routes gated by `requireAdmin()` (ADMIN_EMAILS allowlist or `admin_users`).
- Rate limiting on abuse-prone endpoints (api-keys, optimize, social-connect).
- Webhooks verify signatures (Paddle HMAC-SHA256, NOWPayments HMAC-SHA512).

### Known issues / technical debt
- Social OAuth (YouTube/TikTok/etc.) still **placeholder**; WordPress is real.
- Secure **impersonation**, affiliate **payouts**, coupon/credit-package **editor**
  are architecture-only.
- `/api/v1` external gateway (key auth + rate limit enforcement) not built.
- Rate limiting is **in-memory** (per instance) — move to Redis/Upstash for multi-instance.
- Sentry is abstracted (`lib/logger.ts`) but the SDK isn't wired yet.
- E2E/UI tests not yet automated (unit tests cover critical pure logic).

### Launch readiness assessment
**Ready for public beta.** Core flows (auth, credits, generation, render, publish,
billing webhooks) are functional and validated live. Before GA: wire Sentry, move
rate-limit to Redis, add E2E tests, and complete real social OAuth.

---

## 2. Security Audit Summary

| Control | Status |
|---|---|
| Auth on every route | ✅ Supabase session + per-row ownership |
| RLS on all tables | ✅ owner policies; admin tables service-role only |
| Role verification (admin) | ✅ `requireAdmin` (allowlist or `admin_users`) |
| Secure headers | ✅ HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (`next.config.ts`) |
| Rate limiting | ✅ in-memory token bucket on hot endpoints (Redis for scale) |
| Secrets at rest | ✅ AES-256-GCM (`lib/security/secrets.ts`); set `SECRETS_KEY` |
| API keys | ✅ stored as SHA-256 hash + prefix; plaintext shown once |
| Webhook verification | ✅ Paddle + NOWPayments signature checks |
| SQL injection | ✅ parameterized via Supabase client (no raw SQL from input) |
| XSS | ✅ React escaping; no `dangerouslySetInnerHTML` on user input (only static JSON-LD) |
| Token exposure | ✅ social GET excludes access/refresh tokens |
| File upload validation | ⚠️ media uploads are provider-generated; validate user uploads when added |
| CSRF | ✅ same-site cookies + JSON APIs (no form-action cross-site); add tokens if cookie-auth forms added |
| Audit logging | ✅ `audit_logs` on key/admin/credit/role actions |

**Action items before GA:** rotate all credentials pasted during development; set
`SECRETS_KEY` on Vercel; enable Supabase Postgres SSL enforcement; review Supabase
Storage bucket policies for least privilege.

---

## 3. Performance Audit Summary

- **Bundle:** shared JS ~102 kB first-load; pages 1–6 kB each (code-split per route).
- **Images:** `next/image` + remote patterns; provider images re-hosted to Supabase.
- **Server:** RSC by default; client components only where interactive.
- **DB:** indexed FKs + hot columns; list endpoints `limit`-bounded.
- **Compression:** enabled; `poweredByHeader` disabled; standalone output for slim images.
- **Caching:** static marketing pages prerendered; dynamic dashboard server-rendered.
- **Next steps:** add Redis cache for analytics aggregates; CDN cache headers on public
  assets; queue/cron worker for scheduled publishing + render polling (offload from requests).

Benchmarks (representative, Vercel + Supabase, light load): health check < 150 ms;
API reads 100–400 ms; render submit ~1–2 s (Shotstack); WordPress publish 1–3 s.

---

## 4. Test Coverage Summary

- **Runner:** Vitest (`npm run test`). **14 unit tests, 5 files, all passing.**
- **Covered (critical pure logic):** secret encrypt/decrypt round-trip + tamper +
  legacy passthrough; API key generation/hashing; WordPress URL normalization;
  AI optimizer placeholder output; rate-limit bucket behavior.
- **Run in CI** on every push/PR (GitHub Actions) alongside lint + build.
- **Gaps (roadmap):** integration tests against a Supabase test project; Playwright
  E2E for signup→generate→render→publish; billing webhook simulation tests.

---

## 5. Deployment Guide

**Vercel (primary):**
1. Connect the GitHub repo; Vercel auto-builds on push to `main`.
2. Set env vars (see §6) for Production + Preview.
3. Custom domain `creatorsforge.io` (apex A → Vercel, `www` CNAME → Vercel, **DNS-only**).
4. Health gate: `GET /api/health` returns 200 + `{status:"ok"}`.

**Docker (self-host/alt):**
```bash
docker build -t creatorforge-ai .
docker run -p 3000:3000 --env-file .env.local creatorforge-ai
# or: docker compose up -d   (healthcheck hits /api/health)
```
Uses Next.js standalone output (multi-stage, non-root user).

**Database:** run `supabase/schema.sql` on a fresh project, or apply migrations
`0002`–`0007` in order on an existing one (Supabase SQL editor).

---

## 6. Environment Setup Guide

Required (build + run): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.

Production hardening: **`SECRETS_KEY`** (encrypt stored credentials), `ADMIN_EMAILS`,
optional `SENTRY_DSN`, `NOTIFY_EMAIL`.

Providers (optional, activate real engines): `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY` +
`VOICE_PROVIDER=elevenlabs`, `OPENAI_API_KEY` + `IMAGE_PROVIDER=openai`,
`SHOTSTACK_API_KEY` + `SHOTSTACK_ENV`. Payments: Paddle + NOWPayments keys. Social
OAuth: `<PLATFORM>_CLIENT_ID/SECRET`. See `.env.example` for the full list.

---

## 7. Backup Strategy

- **Database:** enable Supabase **automated daily backups** (Pro plan) + **PITR**.
  Additionally schedule a weekly `pg_dump` to off-site storage (S3/R2).
- **Storage:** enable bucket versioning; periodic sync of the `media` bucket to a
  second bucket/provider.
- **Configuration:** env vars documented in `.env.example`; keep a sealed copy of
  production secrets in a password manager (not in git).
- **Restore testing:** quarterly — restore the latest dump to a staging project and
  run the smoke checklist (§10).
- **Recovery procedures:** documented runbook — restore DB → restore storage →
  redeploy app → verify `/api/health` + a publish smoke test.

---

## 8. Monitoring Guide

- **App health:** `GET /api/health` (db reachability, uptime, latency, version) —
  point an uptime monitor (UptimeRobot/Better Uptime) at it.
- **Admin → Platform Health** (`/admin/monitoring`): render/publish/payments/storage/
  email status + alerts from live tables.
- **Admin → Dashboard** (`/admin`): users, MRR/ARR, failed jobs, open tickets, alerts.
- **Errors:** `captureError()` (`lib/logger.ts`) is the central sink — wire Sentry by
  installing `@sentry/nextjs`, setting `SENTRY_DSN`, and uncommenting the forward.
- **Structured logs:** JSON lines with `category` (auth/payment/publishing/…) — ship
  Vercel/host logs to a log aggregator and alert on `level:"error"`.

---

## 9. Maintenance Plan

- **Weekly:** review admin dashboard alerts + failed jobs; triage support tickets;
  scan audit logs for anomalies.
- **Monthly:** `npm audit` + dependency updates on a branch (CI must pass); review
  credit/billing reconciliation; rotate any near-expiry provider keys.
- **Quarterly:** restore-from-backup drill; access review (admin_users, app passwords);
  performance review (bundle, slow queries).
- **On incident:** check `/api/health` → admin monitoring → logs; use feature flags
  (`/admin/settings`) to disable an affected module; roll back via Vercel "Promote"
  of the last good deployment.

---

## 10. Beta Launch Checklist

**Pre-launch (internal QA):**
- [ ] `SECRETS_KEY` set on Vercel; credentials rotated; service-role key server-only.
- [ ] Migrations `0002`–`0007` applied; `/api/health` green.
- [ ] Smoke: signup → confirm email → generate script → build scenes → voiceover →
      render MP4 → publish (social placeholder + WordPress real) → analytics updates.
- [ ] Billing: crypto + Paddle webhook grants credits (sandbox).
- [ ] Admin portal loads; audit log records actions; CSV export works.
- [ ] Lighthouse: performance/SEO/accessibility ≥ 90 on landing + pricing.

**Closed beta:**
- [ ] Invite cohort; enable only stable feature flags.
- [ ] Bug reporting channel (in-app Support + a form).
- [ ] Collect feedback; track success metrics: activation (first render),
      publish rate, D7 retention, credit consumption, support volume.

**Release management:**
- [ ] Release notes per deploy.
- [ ] Rollback plan: Vercel instant rollback; DB migrations are additive/idempotent.
- [ ] Feature flags to dark-launch/disable modules without redeploying.

**Success metrics (beta exit):** ≥ 60% activation, < 1% error rate, p95 API < 800 ms,
zero critical security findings, positive qualitative feedback.

---

## Accessibility & SEO notes (Modules 13–14)
- **SEO:** `robots.ts` + `sitemap.ts` + JSON-LD (`SoftwareApplication`) on landing;
  Open Graph + Twitter cards + `metadataBase` (Phase 5); brand favicon.
- **Accessibility:** semantic headings, keyboard-focusable controls, color-contrast
  brand palette, responsive layouts. Roadmap: full ARIA pass + automated axe checks in CI.
