# Publishing, Analytics & Automation (Phase 6)

Phase 6 turns CreatorForge AI into a publishing platform: connect social accounts,
compose + schedule + publish rendered videos, optimize metadata with AI, monitor
analytics, get notified, automate workflows, and collaborate in workspaces.

It extends the existing architecture (env-driven providers, owner RLS, server API
routes, client components) — nothing from Phases 1–5 was redesigned.

## Modules → files

| Module | UI page | API | Library |
|---|---|---|---|
| 1 Social Account Manager | `/dashboard/social` | `/api/social`, `/api/social/[id]` | `lib/publishing/providers.ts` (`isPlatformConfigured`) |
| 2 Publishing Center | `/dashboard/publish` | `/api/publish`, `/api/publish/[id]` | `lib/publishing/{types,providers,execute}.ts` |
| 3 Content Calendar | `/dashboard/calendar` | `/api/scheduled` | — |
| 4 AI Content Optimizer | (in Publishing Center) | `/api/optimize` | `lib/ai/optimize.ts` |
| 5 Analytics | `/dashboard/analytics` | `/api/analytics` | `lib/analytics.ts` |
| 6 Notifications | `/dashboard/notifications` | `/api/notifications` | `lib/notifications.ts` |
| 7 Automation | `/dashboard/automation` | `/api/automation`, `/api/automation/[id]` | `lib/automation/engine.ts` |
| 8 Admin Analytics | `/dashboard/admin` | `/api/admin/analytics` | `lib/admin.ts` |
| 9 Team Collaboration | `/dashboard/team` | `/api/workspaces`, `/api/workspaces/members` | `lib/workspace.ts` |

## Publishing architecture

Like the media engine, each platform implements a **provider interface**
(`PublishProvider` in `lib/publishing/types.ts`). `getPublishProvider(platform)`
returns a **real** provider when that platform's OAuth client id + secret env vars
are set, otherwise a **placeholder** that simulates a successful publish so the full
chain works without credentials.

Flow: **Publishing Center** creates a `publish_jobs` row (video + metadata + mode)
and one `scheduled_posts` row per selected platform. For mode `now`, each target is
run immediately by `executePost()`, which calls the provider, writes a
`publish_history` row, updates statuses, emits a notification, and logs an analytics
event. Modes `schedule` / `draft` persist for the calendar / later execution.

Add a real integration by implementing `PublishProvider` and returning it from the
`getPublishProvider` switch when configured — no route or UI change needed.

## Scheduling

`scheduled_posts.scheduled_at` drives the **Content Calendar** (month/week/day).
Drag-and-drop calls `PATCH /api/scheduled` to update `scheduled_at`. A future cron
can drain due posts by calling `executePost()` (the same helper used by mode `now`).

## Analytics model

`analytics_events` is an append-only metric stream (`logEvent`). The analytics
endpoint aggregates it together with core tables (`assets`, `publish_history`,
`render_jobs`, `credit_usage`, `profiles`) into summary cards, a 14-day created-vs-
published series, and per-platform totals. Charts are pure CSS (no chart dependency).

## Notification system

`emitNotification` inserts an in-app `notifications` row. Email delivery is
architected behind `NOTIFY_EMAIL=true` (reuses the Resend transport used for auth).
Emitted on: render complete, publish success/failure (more hooks ready: credits low,
subscription renewed, storage full).

## Automation

`automation_rules` store a `trigger` + `action` + JSON config. `runTrigger()` is
called where events occur (e.g. render completion) and runs matching enabled rules
(`notify`/`warn` emit notifications today; `schedule_publish`/`archive` are wired for
expansion). New triggers/actions are additive.

## Workspace permissions

Roles: **owner · admin · editor · viewer** (`ROLE_CAN` capability map). `getUserRole`
/ `can` gate member-management APIs. RLS uses `SECURITY DEFINER` helpers
(`is_workspace_member`, `is_workspace_admin`) to avoid recursion. Owners always have
full rights. Activity is recorded in `activity_logs`.

## Database migrations

`supabase/migrations/0006_phase6_publishing.sql` (idempotent) adds: `workspaces`,
`workspace_members`, `activity_logs`, `social_accounts`, `publish_jobs`,
`scheduled_posts`, `publish_history`, `analytics_events`, `notifications`,
`automation_rules` — each with indexes, foreign keys, and RLS. Run it in the
Supabase SQL editor (fresh installs get everything from `schema.sql`).

## Environment variables

```
# Admin dashboard access (comma-separated emails)
ADMIN_EMAILS=

# Email notifications (architecture hook; reuses Resend)
NOTIFY_EMAIL=

# Social OAuth (set both id + secret to activate a real provider)
YOUTUBE_CLIENT_ID=        YOUTUBE_CLIENT_SECRET=
TIKTOK_CLIENT_ID=         TIKTOK_CLIENT_SECRET=
INSTAGRAM_CLIENT_ID=      INSTAGRAM_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=       FACEBOOK_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=       LINKEDIN_CLIENT_SECRET=
X_CLIENT_ID=              X_CLIENT_SECRET=
PINTEREST_CLIENT_ID=      PINTEREST_CLIENT_SECRET=
```

Without these, every platform runs in placeholder mode (simulated connect + publish).

## Security

All Phase 6 tables have RLS. User-owned tables (`social_accounts`, `publish_jobs`,
`scheduled_posts`, `publish_history`, `analytics_events`, `notifications`,
`automation_rules`) restrict to `auth.uid() = user_id`. Workspace tables restrict to
members; member management is admin/owner only (enforced both in RLS and in the API
via `can(...)`). Admin analytics is gated by `ADMIN_EMAILS` and uses the service-role
client only after that check. **Access tokens in `social_accounts` should be
encrypted at rest before a real launch.**

## WordPress (real blog publishing)

WordPress is a **real** publish provider (not placeholder) for SEO auto-blogging.

- **Connect:** Social Accounts → WordPress → enter **Site URL + WP username +
  Application Password** (WordPress 5.6+: Users → Profile → Application Passwords).
  Verified via `GET /wp-json/wp/v2/users/me` (Basic auth); credentials stored on
  the `social_accounts` row (`access_token` = app password, `metadata.site_url`).
  The app password is **revocable** in WP and never returned to the browser.
- **Publish:** `lib/publishing/providers/wordpress.ts` POSTs to
  `/wp-json/wp/v2/posts`. The post **title** = job title, **content** = the
  project's latest generated article/script (plain text auto-wrapped to HTML),
  **excerpt** = description, **status** = publish (public) / draft (unlisted) /
  private. Returns the live post URL.
- **Flow:** generate a Blog-Posts script → AI optimize → select WordPress in the
  Publishing Center → Publish now / schedule. Works with the Phase 6 scheduler &
  automation for hands-off daily posting.
- **Roadmap:** map tags/categories to WP term IDs, upload featured image via the
  media endpoint, and write Yoast/Rank Math SEO meta. Encrypt the app password at rest.
