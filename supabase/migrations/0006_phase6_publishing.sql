-- =====================================================================
-- Phase 6 migration: Social publishing, analytics, automation & teams.
-- Adds 10 tables + indexes + RLS. Idempotent — safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Workspaces & membership (team collaboration)
-- ---------------------------------------------------------------------
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'My Workspace',
  created_at  timestamptz not null default now()
);
create index if not exists idx_workspaces_owner on public.workspaces(owner_id);

create table if not exists public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  invited_email text,
  role          text not null default 'viewer',   -- owner | admin | editor | viewer
  status        text not null default 'invited',   -- invited | active
  created_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists idx_ws_members_ws   on public.workspace_members(workspace_id);
create index if not exists idx_ws_members_user on public.workspace_members(user_id);

create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  action       text not null,
  target_type  text,
  target_id    uuid,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_activity_ws   on public.activity_logs(workspace_id);
create index if not exists idx_activity_user on public.activity_logs(user_id);

-- ---------------------------------------------------------------------
-- Social accounts (connected platforms)
-- ---------------------------------------------------------------------
create table if not exists public.social_accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  workspace_id   uuid references public.workspaces(id) on delete set null,
  platform       text not null,                       -- youtube | tiktok | instagram | facebook | linkedin | x | pinterest
  account_name   text,
  account_handle text,
  external_id    text,
  access_token   text,                                -- NOTE: encrypt at rest before real launch
  refresh_token  text,
  scope          text,
  status         text not null default 'connected',   -- connected | expired | revoked
  expires_at     timestamptz,
  last_synced_at timestamptz,
  connected_at   timestamptz not null default now(),
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  unique (user_id, platform, external_id)
);
create index if not exists idx_social_user on public.social_accounts(user_id);
create index if not exists idx_social_ws   on public.social_accounts(workspace_id);

-- ---------------------------------------------------------------------
-- Publishing: jobs (a video + metadata + mode) and per-platform targets
-- ---------------------------------------------------------------------
create table if not exists public.publish_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id   uuid references public.projects(id) on delete set null,
  asset_id     uuid references public.assets(id) on delete set null,
  video_url    text,
  title        text not null default '',
  description  text not null default '',
  hashtags     text[] not null default '{}',
  tags         text[] not null default '{}',
  thumbnail_url text,
  playlist     text,
  category     text,
  visibility   text not null default 'public',        -- public | unlisted | private
  mode         text not null default 'draft',         -- now | schedule | draft
  status       text not null default 'draft',         -- draft | scheduled | publishing | published | failed
  scheduled_at timestamptz,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_pubjobs_user    on public.publish_jobs(user_id);
create index if not exists idx_pubjobs_status   on public.publish_jobs(status);
create index if not exists idx_pubjobs_project  on public.publish_jobs(project_id);

create table if not exists public.scheduled_posts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  publish_job_id    uuid not null references public.publish_jobs(id) on delete cascade,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  platform          text not null,
  scheduled_at      timestamptz not null default now(),
  status            text not null default 'scheduled',  -- scheduled | publishing | published | failed | draft
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_sched_user on public.scheduled_posts(user_id);
create index if not exists idx_sched_when on public.scheduled_posts(scheduled_at);
create index if not exists idx_sched_job  on public.scheduled_posts(publish_job_id);

create table if not exists public.publish_history (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  publish_job_id    uuid references public.publish_jobs(id) on delete cascade,
  scheduled_post_id uuid references public.scheduled_posts(id) on delete set null,
  platform          text not null,
  status            text not null,                      -- published | failed
  external_post_id  text,
  external_url      text,
  error             text,
  published_at      timestamptz,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists idx_pubhist_user on public.publish_history(user_id);
create index if not exists idx_pubhist_job  on public.publish_history(publish_job_id);

-- ---------------------------------------------------------------------
-- Analytics events (append-only metric stream)
-- ---------------------------------------------------------------------
create table if not exists public.analytics_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id   uuid references public.projects(id) on delete set null,
  event_type   text not null,    -- video_created | video_published | view | engagement | credits_consumed | render | storage
  platform     text,
  value        numeric not null default 0,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_analytics_user on public.analytics_events(user_id);
create index if not exists idx_analytics_type on public.analytics_events(event_type);
create index if not exists idx_analytics_time on public.analytics_events(created_at);

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,   -- render_complete | publish_success | publish_failed | credits_low | subscription_renewed | storage_full
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications(user_id);
create index if not exists idx_notif_read on public.notifications(user_id, read);

-- ---------------------------------------------------------------------
-- Automation rules
-- ---------------------------------------------------------------------
create table if not exists public.automation_rules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid references public.workspaces(id) on delete set null,
  name          text not null,
  trigger       text not null,   -- render_complete | publish_success | credits_low | project_completed
  conditions    jsonb not null default '{}'::jsonb,
  action        text not null,   -- schedule_publish | notify | warn | archive
  action_config jsonb not null default '{}'::jsonb,
  enabled       boolean not null default true,
  last_run_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_automation_user on public.automation_rules(user_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.activity_logs     enable row level security;
alter table public.social_accounts   enable row level security;
alter table public.publish_jobs      enable row level security;
alter table public.scheduled_posts   enable row level security;
alter table public.publish_history   enable row level security;
alter table public.analytics_events  enable row level security;
alter table public.notifications     enable row level security;
alter table public.automation_rules  enable row level security;

-- Owner-based policies for straightforward user-owned tables.
do $$
declare t text;
begin
  foreach t in array array[
    'social_accounts','publish_jobs','scheduled_posts','publish_history',
    'analytics_events','notifications','automation_rules'
  ]
  loop
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner" on public.%I
         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t, t
    );
  end loop;
end $$;

-- Membership check helper (SECURITY DEFINER avoids RLS recursion on workspace_members).
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid()
  ) or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid()
  ) or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('owner','admin')
  );
$$;

-- workspaces: members can read; only owner can modify.
drop policy if exists "workspaces_read" on public.workspaces;
create policy "workspaces_read" on public.workspaces
  for select using (owner_id = auth.uid() or public.is_workspace_member(id));
drop policy if exists "workspaces_write" on public.workspaces;
create policy "workspaces_write" on public.workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- workspace_members: members can read the roster; admins manage.
drop policy if exists "ws_members_read" on public.workspace_members;
create policy "ws_members_read" on public.workspace_members
  for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id));
drop policy if exists "ws_members_write" on public.workspace_members;
create policy "ws_members_write" on public.workspace_members
  for all using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- activity_logs: members can read; any member can append.
drop policy if exists "activity_read" on public.activity_logs;
create policy "activity_read" on public.activity_logs
  for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id));
drop policy if exists "activity_write" on public.activity_logs;
create policy "activity_write" on public.activity_logs
  for insert with check (user_id = auth.uid());
