-- =====================================================================
-- Weekly account usage summary.
--
-- Stores one report per user per week plus granular line items and delivery
-- logs, and extends notification preferences with weekly-digest scheduling.
-- Owner-only RLS; scheduler/admin writes via the service-role client. Idempotent.
-- =====================================================================

-- Weekly digest scheduling (master toggle `weekly_summary` already exists in 0022).
alter table public.notification_preferences add column if not exists weekly_email    boolean not null default true;
alter table public.notification_preferences add column if not exists weekly_inapp    boolean not null default true;
alter table public.notification_preferences add column if not exists weekly_day      text    not null default 'monday';   -- monday..sunday
alter table public.notification_preferences add column if not exists weekly_time     text    not null default '09:00';    -- HH:MM (24h)
alter table public.notification_preferences add column if not exists weekly_timezone text    not null default 'UTC';      -- IANA tz

create table if not exists public.weekly_usage_reports (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  week_start           date not null,
  week_end             date not null,
  credits_used         integer not null default 0,
  credits_remaining    integer not null default 0,
  credits_topped_up    integer not null default 0,
  videos_created       integer not null default 0,
  seo_articles_created integer not null default 0,
  ads_created          integer not null default 0,
  books_created        integer not null default 0,
  posts_published      integer not null default 0,
  posts_scheduled      integer not null default 0,
  failed_jobs          integer not null default 0,
  subscription_status  text,
  renewal_date         timestamptz,
  metrics_json         jsonb not null default '{}'::jsonb,   -- extra counts (images, voiceovers, automations, chapters, prev-week comparisons)
  recommendations_json jsonb not null default '[]'::jsonb,
  created_at           timestamptz not null default now()
);
create unique index if not exists uq_weekly_report on public.weekly_usage_reports(user_id, week_start);
create index if not exists idx_weekly_report_user on public.weekly_usage_reports(user_id, week_start desc);

create table if not exists public.weekly_usage_report_items (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.weekly_usage_reports(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null,          -- credits | content | publishing | automation | billing
  label      text not null,
  value      numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_weekly_items_report on public.weekly_usage_report_items(report_id);

create table if not exists public.weekly_summary_delivery_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  report_id     uuid references public.weekly_usage_reports(id) on delete set null,
  channel       text not null,       -- email | in_app
  status        text not null,       -- sent | failed | skipped
  provider      text,
  error_message text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_weekly_logs_user on public.weekly_summary_delivery_logs(user_id, created_at desc);

-- ---- RLS -----------------------------------------------------------------
alter table public.weekly_usage_reports        enable row level security;
alter table public.weekly_usage_report_items   enable row level security;
alter table public.weekly_summary_delivery_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='weekly_usage_reports' and policyname='wur_select_own') then
    create policy wur_select_own on public.weekly_usage_reports for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='weekly_usage_report_items' and policyname='wuri_select_own') then
    create policy wuri_select_own on public.weekly_usage_report_items for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='weekly_summary_delivery_logs' and policyname='wsdl_select_own') then
    create policy wsdl_select_own on public.weekly_summary_delivery_logs for select using (auth.uid() = user_id);
  end if;
end $$;
