# Admin Operations Review Center

Admin-only command center (`/admin/operations`) that watches every external
dependency — API keys, subscriptions, credit balances, quotas, webhooks,
database/storage, costs — and alerts the admin BEFORE anything expires, runs
out, or breaks users.

Complements `/admin/infra` (live env-configuration layer, migration 0011):
Infra answers "is it configured right now"; Operations answers "when does it
renew / rotate / run out, and what should I do".

## Architecture
- **Registry** `src/lib/operations/registry.ts` — 31 providers across 9
  categories (AI, SEO, leads, payments, storage, database, email, publishing,
  infrastructure), each with env keys, rotation policy, quota types, webhook
  path, login/support/docs URLs. GET endpoints seed DB rows idempotently.
- **Status engine** `status.ts` — pure, unit-tested: key rotation
  (healthy / rotate_soon ≤14d / overdue), renewals (30/14/7/3/1-day threshold
  buckets + expired), balances (warning 30% / critical 10% / exhausted +
  runway from daily burn), quotas (70/85/95/100%), webhooks (failing after 3+
  consecutive failures). `evaluateOpsAlerts()` emits deduped alerts with a
  recommended action each.
- **Alerts** `alerts.ts` — dedupe-key upsert (one alert per condition per
  month) + admin emails (ADMIN_EMAILS via Brevo) for critical alerts, sent once.
- **Schema** migration `0029_operations_review.sql` — 12 `operations_*`
  tables, RLS enabled with NO policies (service-role behind `requireAdmin()`).

## Pages (Admin → Operations Review)
Overview · Alerts · API Key Rotation · Subscriptions · Credit Balances ·
Usage Quotas · Database & Storage · Webhooks · Service Health · Monthly
Checklist · Renewal Calendar · Cost Forecast.

## API (all requireAdmin, mutations audited)
`/api/admin/operations/{overview,providers,api-keys,subscriptions,credits,
quotas,storage,webhooks,alerts,checklist,cost-forecast}` + actions
`mark-resolved` (critical requires confirm), `mark-rotated`, `mark-renewed`
(advances one billing cycle), `mark-topup-completed` (resets baseline +
auto-resolves low-credit alerts).

## Cron
`/api/cron/operations` (daily 07:00 UTC, CRON_SECRET fail-closed): evaluates
all rules → persists alerts → emails critical ones → logs health snapshots →
creates the monthly checklist on the 1st → Monday weekly / 1st-of-month
summary emails. Weekly+monthly logic is folded into the daily job so it also
works within Vercel Hobby cron limits.

## Security
Full API keys are NEVER stored or displayed — masked hints only
(`sk-****abcd`, computed server-side). No provider passwords. Admin-only RLS.
Every mutation writes to `audit_logs`. Critical alert resolution requires an
explicit confirmation.

## Honest data-entry model
Most providers do not expose balances/renewal dates via API, so those fields
are admin-maintained (the point of the monthly checklist). What IS automatic:
env-configuration status, alert evaluation + emails, checklist creation,
health logs, cost aggregation + forecast, unit-economics from live platform
counts. **Run migration 0029, then open Service Health and fill in each
provider's plan/cost/renewal once — alerts take over from there.**
