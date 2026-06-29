# CreatorForge Autopilot

AI campaign automation: configure a strategy once and Autopilot plans, schedules,
and (in Full mode) publishes content, then reports — with credit gating and
connected-account safety. **Autopilot never claims to post unless the destination
is connected and the action succeeds.**

## 1. Campaign architecture

A **campaign** captures business profile, goals, content types, frequency,
publishing windows/timezone, destinations, and an automation **mode**:

- **Manual** — AI creates; you publish manually (jobs land as `planned`).
- **Assisted** — AI creates + schedules; you approve the queue (`awaiting_approval`).
- **Full Autopilot** — AI creates + schedules + publishes on schedule (`scheduled`
  → cron publishes), then reports.

The **AI planning engine** (`lib/autopilot/planner.ts`) turns the campaign into an
editable content queue spread across the next N days using the frequency,
content-type rotation, and publish windows.

## 2. Dashboard pages

Sidebar group **CreatorForge Autopilot**: Overview, Campaigns (+ 7-step Wizard at
`/campaigns/new`), Planner, Automation Rules, Publishing Queue, Reports, History,
Settings.

## 3. Automation workflow

`Campaign → Generate plan → jobs created (status by mode) → Queue/Planner → (Full)
cron publishes due jobs → History + Reports`. Users can pause/resume campaigns and
switch modes anytime; rules let users express cadences (generate/publish schedules,
chaining, pause-on-low-credits, resume-on-credit).

## 4. Queue management

`autopilot_jobs` is the canonical queue with statuses: planned, queued, generating,
awaiting_approval, scheduled, publishing, published, failed. The Queue Manager
shows platform, content type, scheduled time, status, error, and per-job actions
(Approve, Retry, Reschedule, Cancel). The Planner groups jobs by day with a status
legend.

## 5. Database migrations (`0015_autopilot.sql`)

`autopilot_campaigns`, `autopilot_rules`, `autopilot_jobs`, `autopilot_queue`,
`autopilot_reports`, `autopilot_history`, `autopilot_settings` — owner-only RLS.
(Namespaced `autopilot_` to avoid clobbering the Phase-6 `automation_rules` table.)

## 6. API routes

`/api/autopilot/{campaigns,rules,queue,plan,reports,settings,recommendations,history}`
(owner-scoped) and `/api/cron/autopilot` (CRON_SECRET-secured processor). Added to
`vercel.json` (hourly; on Hobby, Vercel limits crons to 1×/day — adjust if needed).

## 7. Credit integration

Each content type carries a credit estimate (mirrors real costs). The plan endpoint
returns the total estimate vs balance so the UI warns before generating. The cron
processor **gates on credits**: if balance < a job's estimate and
`pause_on_low_credits` is on, the campaign is paused (history logged); otherwise the
job fails with a clear message. Credits are deducted through the wallet ledger
(`wallet_adjust`, reason `autopilot:<type>`). Credits are never consumed beyond the
balance.

## 8. Testing summary

`npm run build` compiles all routes/pages/components. Create a campaign via the
wizard → Generate plan → jobs appear in Planner/Queue with the right status for the
mode. Switch a campaign to Full + connect a destination → the cron publishes due
jobs (deducting credits, logging history); without a connected destination the job
is paused and reported. Reports aggregate generated/published/failed/success-rate
and upcoming schedule. Recommendations are suggestions only.

## 9. Known limitations

- The cron owns the job **lifecycle, credit gating, and connected-account safety
  checks**, but the actual platform API call is delegated to the existing publishing
  pipeline (dormant until per-platform provider keys are set). A job is only marked
  published when its destination is connected — it never claims a post to an
  unconfigured destination, but wiring each provider's real post call into the
  processor is the remaining integration step.
- Content **generation** in the queue is represented as jobs; hooking each content
  type into its existing engine (SEO article, render, social) is the next wire.
- Scheduling is stored/processed in UTC; per-timezone display localization.

## 10. Future improvements

- Wire real per-platform publishing + content generation into the processor.
- Drag-and-drop rescheduling on the Planner (currently prompt-based reschedule).
- Rule engine execution (cron evaluates `autopilot_rules` to auto-generate plans).
- Email/in-app delivery of daily/weekly/monthly reports; A/B cadence suggestions.
