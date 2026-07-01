# Weekly Account Usage Summary

A proactive weekly digest of each user's activity, credit health, upcoming
schedule, and recommended next actions — delivered by email, in-app, and a
dashboard card. Builds on the notification system (Brevo email, `notify()`,
preferences, delivery logs) and cron patterns.

## What's summarized
Credits used / remaining / topped up, monthly + purchased credits, estimated
days remaining; content created (videos, SEO articles, ads, books/chapters,
images, voiceovers); publishing (published / scheduled / failed / upcoming);
automation (active / completed / paused / failed); billing (plan, status,
renewal); and rule-based recommendations.

## Report builder — `lib/reports/weekly.ts`
`buildWeeklyReport(client, userId, start, end)` aggregates from many source
tables. **Every aggregation is individually guarded** (`countIn`/`sumIn` return 0
on error), so a missing or renamed table degrades one metric to 0 rather than
breaking the report. `saveWeeklyReport()` upserts by `(user_id, week_start)`.
Helpers `weekRange(weeksAgo)` and `mondayUtc(date)` define week windows (Mon–Sun,
UTC). Recommendations are deterministic (credit runway, week-over-week video
delta, upcoming posts, idle SEO Studio, failed jobs, renewal countdown).

## Channels
- **Email** — `weeklySummaryEmail(name, report)` (branded, 8 sections + 4 CTAs).
- **In-app** — via `notify()` (type `weekly_summary`), surfaced by the bell + list.
- **Dashboard card** — `WeeklySummaryCard` on the home page.
- **Full report page** — `/dashboard/reports/weekly` with This week / Last week / Last 4 weeks / Custom range filters.

## Scheduler
`/api/jobs/weekly-summary` (Vercel cron `0 * * * *`, hourly, `CRON_SECRET`-gated).
Each run: for every enabled user (missing prefs ⇒ enabled by default) whose
**local** weekday + hour (computed via `Intl.DateTimeFormat` in their timezone)
match their preferred delivery day/time, and who has no report yet for the
current week, it builds + saves the report, emails it (if `weekly_email`),
creates the in-app notification (if `weekly_inapp`), and logs delivery. Dedup is
the `(user_id, week_start)` unique index.

## Preferences (`Settings → Notifications → Weekly Summary`)
`weekly_summary` (master), `weekly_email`, `weekly_inapp`, `weekly_day`
(monday–sunday), `weekly_time` (HH:MM), `weekly_timezone` (IANA). Defaults:
enabled, Monday, 09:00, UTC. Managed via `/api/notifications/weekly-summary/preferences`.

## Database (migration `0023_weekly_summary.sql`)
- `weekly_usage_reports` (one per user per week, unique `(user_id, week_start)`; core counts + `metrics_json` + `recommendations_json`).
- `weekly_usage_report_items` (granular line items).
- `weekly_summary_delivery_logs` (per-channel delivery audit).
- `notification_preferences` extended with the weekly scheduling columns.
- Owner-only RLS; scheduler/admin writes via the service-role client.

## API routes
- `GET /api/reports/weekly` (latest saved, or live for the last week if none)
- `GET /api/reports/weekly/history`
- `POST /api/reports/weekly/generate` (this / last / 4weeks / custom, live)
- `GET|PUT /api/notifications/weekly-summary/preferences`
- `GET /api/admin/reports/weekly-summary` (admin analytics)
- `GET|POST /api/jobs/weekly-summary` (cron)

## Admin analytics (`Admin → Notifications`)
Summaries sent, failed deliveries, open/click rate (placeholders), low-credit
users, users with failed jobs, and recent weekly delivery logs.

## Security
Owner-only RLS on reports/items/logs; user report generation runs through the
session client so RLS scopes data to the requester; admin route gated by
`requireAdmin()`; generation rate-limited; cron behind `CRON_SECRET`. Delivery
logs store status/provider/error only — no credentials or sensitive billing data.

## Env
`CRON_SECRET`, `BREVO_API_KEY` (+ sender), `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Future improvements
Real open/click tracking, month/quarter digests, per-metric opt-in, CSV/PDF
export, and Claude-authored narrative recommendations.
