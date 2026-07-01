# Credit & Subscription Notification System

Keeps users ahead of interruptions with timely in-app + email alerts for credit
thresholds, subscription renewals, payment failures, and top-ups.

## Channels
- **In-app** — rows in `notifications`, surfaced by the Topbar bell + `/dashboard/notifications`.
- **Email** — Brevo transactional (`lib/email/send.ts`), branded templates (`lib/email/templates.ts`).
- **Admin logs** — every attempt recorded in `notification_delivery_logs`; surfaced at `/admin/notifications`.

## Alert rules
- **Credits** (cron, every 6h): 25% → low, 10% → critical, 0 → exhausted. Only the most-severe crossed threshold fires per run. Thresholds are admin-editable (`notification_rules.credit_thresholds`).
- **Subscription** (cron, daily 08:00): reminders at 14 / 7 / 3 / 1 days before `current_period_end` (admin-editable `subscription_reminders`).
- **Event-driven** (webhooks): top-up success, subscription renewed, payment failed, subscription cancelled/expired.

## Duplicate prevention
`notification_events` has a unique index on `(user_id, notification_type, threshold, billing_period)`. The service checks it before sending and records it after. `billing_period` is the wallet renewal date (or month) for credits and `current_period_end` for subscriptions, so a new cycle re-arms alerts. A top-up calls `clearCreditDedup()` so a later drop in the same cycle can alert again.

## Preferences (`Settings → Notifications`)
Per-user toggles: email/in-app for credit + subscription, email payment, weekly summary. **Payment/security email alerts cannot be disabled** — the API forces `email_payment = true`. Payment-category notifications bypass preference checks entirely.

## Core service — `lib/notifications/service.ts`
`notify(admin, input)` is the single entry point: dedup check → load prefs → insert in-app row (if allowed) → send email (if allowed) → write delivery logs → record dedup event. CTA URLs are validated to same-origin/relative only. Uses the service-role client (cron/webhook contexts).

## Database (migration `0022_notification_system.sql`)
- `notifications` extended: `status, cta_label, cta_url, read_at`.
- `notification_preferences`, `notification_delivery_logs`, `notification_events` (unique dedup), `notification_rules` (seeded `credit_thresholds` [25,10,0] + `subscription_reminders` [14,7,3,1]).
- Owner-only RLS on user tables; rules/logs writes via service role.

## API routes
- `GET /api/notifications`, `POST /api/notifications/mark-read` ({id}|{all})
- `GET|PUT /api/notifications/preferences`
- `GET /api/admin/notifications/logs` (stats + logs), `GET|PUT /api/admin/notifications/rules`
- `GET|POST /api/jobs/check-credit-alerts` (cron, 6h), `GET|POST /api/jobs/check-subscription-alerts` (cron, daily)

## Scheduler
`vercel.json` crons: `check-credit-alerts` `0 */6 * * *`, `check-subscription-alerts` `0 8 * * *`. Both require `Authorization: Bearer $CRON_SECRET`. They iterate users via the admin client and delegate to `notify()`.

## Security
- Users read only their own notifications/prefs/logs (RLS). Admin routes gated by `requireAdmin()`.
- No private billing data in payloads; delivery logs store status/provider/error only — never tokens or bodies.
- Rate-limited: mark-read 60/min, prefs 20/min, admin rules 20/min; cron behind `CRON_SECRET`.
- CTA URLs validated (same-origin/relative). Failed emails logged safely (status + error code, no secrets).

## Env
`CRON_SECRET` (jobs), `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME`, `NEXT_PUBLIC_APP_URL`, plus existing `SUPABASE_SERVICE_ROLE_KEY`.

## Future improvements
- Admin "resend failed email" action; weekly-summary job; user-facing security/notification history; SMS/push channels; per-type granularity.
