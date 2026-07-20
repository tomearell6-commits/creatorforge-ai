-- Lead Generator fixes (audit 2026-07-18)

-- C4: lead_usage_logs had RLS enabled but only a SELECT policy, so every usage
-- INSERT (including the per-day "send" counter that enforces the daily send cap)
-- silently failed and sendsToday was always 0 — defeating the cap. Add an
-- owner-scoped INSERT policy so the logs actually persist.
drop policy if exists "llog_insert_own" on public.lead_usage_logs;
create policy "llog_insert_own" on public.lead_usage_logs
  for insert with check (auth.uid() = user_id);

-- H1: persist each internal list's Brevo contact-list id on OUR row. Campaign
-- creation now looks this up server-side instead of trusting a client-supplied
-- id (which could target another tenant's list on the shared Brevo account), and
-- re-syncs reuse the same Brevo list instead of creating duplicates.
alter table public.lead_lists add column if not exists brevo_list_id bigint;
