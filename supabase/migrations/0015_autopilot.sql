-- =====================================================================
-- CreatorForge Autopilot — AI campaign automation.
--
-- Namespaced with the autopilot_ prefix to avoid clobbering the Phase-6
-- automation_rules table (different feature). Owner-only RLS throughout.
-- Autopilot never publishes unless a destination is connected and the action
-- succeeds; the cron processor gates on credits and records history.
--
-- Idempotent: safe to re-run.
-- =====================================================================

create table if not exists public.autopilot_campaigns (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  industry          text,
  country           text,
  language          text default 'en',
  website           text,
  brand_description text,
  goals             jsonb not null default '[]'::jsonb,   -- ["traffic","sales",...]
  content_types     jsonb not null default '[]'::jsonb,   -- ["ai_shorts","blog",...]
  frequency         text not null default 'weekly',       -- daily | twice_daily | three_weekly | weekly | custom
  publish_windows   jsonb not null default '[]'::jsonb,   -- ["09:00","18:00"]
  timezone          text default 'UTC',
  destinations      jsonb not null default '[]'::jsonb,   -- ["wordpress","youtube",...]
  mode              text not null default 'manual',       -- manual | assisted | full
  status            text not null default 'active',       -- active | paused
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_autopilot_campaigns_user on public.autopilot_campaigns(user_id, created_at desc);

create table if not exists public.autopilot_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.autopilot_campaigns(id) on delete cascade,
  name        text not null,
  rule_type   text not null,             -- generate_schedule | publish_schedule | chain | pause_low_credits | resume_on_credits
  config      jsonb not null default '{}'::jsonb,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_autopilot_rules_user on public.autopilot_rules(user_id);
create index if not exists idx_autopilot_rules_campaign on public.autopilot_rules(campaign_id);

create table if not exists public.autopilot_jobs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  campaign_id    uuid references public.autopilot_campaigns(id) on delete cascade,
  title          text,
  content_type   text not null,          -- ai_shorts | long_video | blog | seo_article | product_ad | social_post | newsletter
  destination    text,                   -- wordpress | youtube | tiktok | instagram | facebook | linkedin | pinterest | x | email | website
  status         text not null default 'queued', -- planned | queued | generating | awaiting_approval | scheduled | publishing | published | failed
  scheduled_time timestamptz,
  published_time timestamptz,
  credits_used   integer not null default 0,
  estimated_credits integer not null default 0,
  error_message  text,
  retry_count    integer not null default 0,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_autopilot_jobs_user on public.autopilot_jobs(user_id, scheduled_time);
create index if not exists idx_autopilot_jobs_campaign on public.autopilot_jobs(campaign_id);
create index if not exists idx_autopilot_jobs_status on public.autopilot_jobs(status, scheduled_time);

-- Thin ordered working set (the app treats autopilot_jobs as canonical).
create table if not exists public.autopilot_queue (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  job_id      uuid not null references public.autopilot_jobs(id) on delete cascade,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_autopilot_queue_user on public.autopilot_queue(user_id, position);

create table if not exists public.autopilot_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.autopilot_campaigns(id) on delete cascade,
  period      text not null,             -- daily | weekly | monthly
  report_json jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_autopilot_reports_user on public.autopilot_reports(user_id, created_at desc);

create table if not exists public.autopilot_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.autopilot_campaigns(id) on delete set null,
  job_id      uuid references public.autopilot_jobs(id) on delete set null,
  action      text not null,             -- generated | scheduled | published | failed | paused | resumed | approved
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_autopilot_history_user on public.autopilot_history(user_id, created_at desc);

create table if not exists public.autopilot_settings (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  default_mode         text not null default 'manual',
  retry_limit          integer not null default 2,
  pause_on_low_credits boolean not null default true,
  low_credit_threshold integer not null default 50,
  email_reports        boolean not null default false,
  updated_at           timestamptz not null default now()
);

-- =====================================================================
-- RLS — owner-only.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'autopilot_campaigns','autopilot_rules','autopilot_jobs','autopilot_queue',
    'autopilot_reports','autopilot_history','autopilot_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t, t);
  end loop;
end $$;
