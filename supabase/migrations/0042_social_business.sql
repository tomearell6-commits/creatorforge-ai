-- 0042_social_business.sql — Social Business Studio
-- Additive. REUSES the existing public.social_accounts (Phase 6) for connections
-- and the unified publishing tables; adds only the studio's new tables. Owner-RLS
-- + workspace_id. Idempotent. Provider tokens live in social_accounts (encrypted).

create table if not exists public.social_account_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid, provider text, permission text not null, granted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid, provider text,
  bio text, about text, description text, website text, category text, cta text,
  profile_image_url text, cover_image_url text, completeness integer,
  updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);

create table if not exists public.social_profile_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid, provider text, health_score integer,
  missing_json jsonb not null default '[]'::jsonb, recommendations_json jsonb not null default '[]'::jsonb,
  report_json jsonb not null default '{}'::jsonb, credits_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.social_content_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, workspace_id uuid,
  campaign_id uuid, name text not null, business text, product text, goal text, audience text,
  country text, language text default 'English', tone text, offer text, cta text,
  content_type text, platforms_json jsonb not null default '[]'::jsonb, brand_kit_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft', credits_used integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.social_content_variations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.social_content_projects(id) on delete cascade,
  platform text not null, headline text, caption text, body text, cta text,
  hashtags_json jsonb not null default '[]'::jsonb, image_prompt text, video_prompt text,
  format text, suggested_time text, accessibility_text text, compliance_notes text,
  image_url text, video_url text, status text not null default 'draft',
  created_at timestamptz not null default now()
);
create index if not exists scv_project_idx on public.social_content_variations (project_id);

create table if not exists public.social_media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid, kind text, url text, prompt text, created_at timestamptz not null default now()
);

create table if not exists public.social_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, workspace_id uuid,
  name text not null, goal text, audience text, platforms_json jsonb not null default '[]'::jsonb,
  schedule_json jsonb not null default '{}'::jsonb, approval_mode text default 'assisted',
  budget numeric, status text not null default 'draft', summary text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.social_campaign_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.social_campaigns(id) on delete cascade,
  project_id uuid, platform text, scheduled_for timestamptz, status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.social_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid, campaign_id uuid, platform text not null, account_id uuid,
  status text not null default 'pending'
    check (status in ('pending','publishing','published','scheduled','failed','cancelled','unavailable','export_ready')),
  external_url text, error text, credits_charged integer not null default 0, retry_count integer not null default 0,
  scheduled_for timestamptz, published_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists spj_user_idx on public.social_publish_jobs (user_id, created_at desc);

create table if not exists public.social_publish_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid, platform text, event_type text, status text, message text,
  created_at timestamptz not null default now()
);

create table if not exists public.social_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid, platform text, scheduled_for timestamptz, timezone text, status text default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists public.social_inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid, provider text, item_type text, external_id text, author text, text text,
  classification text, status text not null default 'new', received_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sinbox_user_idx on public.social_inbox_items (user_id, created_at desc);

create table if not exists public.social_reply_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  inbox_item_id uuid references public.social_inbox_items(id) on delete cascade,
  tone text, draft_text text, status text not null default 'draft'
    check (status in ('draft','approved','sent','flagged','escalated')),
  needs_human boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists public.social_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid, provider text, metric text, period_start date, period_end date,
  value numeric, previous_value numeric, available boolean not null default true, estimated boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.social_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null, data_json jsonb not null default '{}'::jsonb, credits_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.social_automation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, workspace_id uuid,
  name text not null, mode text not null default 'assisted' check (mode in ('manual','assisted','autopilot')),
  rule_type text, config_json jsonb not null default '{}'::jsonb, enabled boolean not null default false,
  last_run_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.social_connection_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid, provider text, action text not null, detail text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'social_account_permissions','social_profiles','social_profile_audits','social_content_projects',
    'social_content_variations','social_media_assets','social_campaigns','social_campaign_items',
    'social_publish_jobs','social_publish_events','social_schedules','social_inbox_items',
    'social_reply_drafts','social_analytics','social_reports','social_automation_rules','social_connection_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format('create policy %I_own on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
  end loop;
end $$;
