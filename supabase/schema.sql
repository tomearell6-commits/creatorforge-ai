-- =====================================================================
-- CreatorForge AI — Database schema (Phase 1)
-- Run this in the Supabase SQL Editor (or `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- =====================================================================

-- Note on "users": Supabase manages auth in the built-in `auth.users` table.
-- We do NOT create a public users table; instead `profiles` extends auth.users.
-- The remaining tables reference auth.users(id).

-- ---------- profiles -------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  plan        text not null default 'free',
  credits     integer not null default 20,
  created_at  timestamptz not null default now()
);

-- ---------- categories (reference data) ------------------------------
create table if not exists public.categories (
  slug        text primary key,
  name        text not null,
  description text,
  emoji       text
);

-- ---------- projects -------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  category    text not null references public.categories(slug),
  idea        text,
  status      text not null default 'draft', -- draft | generating | ready
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- generated_scripts ----------------------------------------
create table if not exists public.generated_scripts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  model       text,
  tokens_used integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- scenes (Phase 2: video scene breakdown) ------------------
create table if not exists public.scenes (
  id          uuid primary key default gen_random_uuid(),
  script_id   uuid not null references public.generated_scripts(id) on delete cascade,
  position    integer not null default 0,
  text        text,
  image_url   text,
  voice_url   text,
  created_at  timestamptz not null default now()
);

-- ---------- videos (Phase 2: rendered videos) ------------------------
create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  url         text,
  status      text not null default 'pending', -- pending | rendering | done | failed
  created_at  timestamptz not null default now()
);

-- ---------- subscriptions --------------------------------------------
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan            text not null default 'free',
  status          text not null default 'active', -- active | canceled | past_due
  provider        text,          -- paddle | crypto
  provider_sub_id text,
  current_period_end timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- credit_usage ---------------------------------------------
create table if not exists public.credit_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      integer not null,          -- negative = consumed, positive = granted
  reason      text,                       -- e.g. 'script_generation', 'monthly_grant'
  created_at  timestamptz not null default now()
);

-- ---------- payment_transactions (Paddle / card) ---------------------
create table if not exists public.payment_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  provider    text not null default 'paddle',
  provider_txn_id text,
  amount      numeric(10,2),
  currency    text default 'USD',
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);

-- ---------- crypto_transactions --------------------------------------
create table if not exists public.crypto_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  provider    text not null default 'crypto',
  charge_id   text,
  amount      numeric(18,8),
  currency    text,               -- BTC | ETH | USDT ...
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);

-- ---------- settings (per-user app settings) ------------------------
create table if not exists public.settings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  theme       text not null default 'system',  -- system | light | dark
  preferences jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Auto-create a profile (+ settings) when a new auth user signs up.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (user_id) do nothing;

  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Atomically deduct credits for the calling user and record the usage.
-- Returns the new balance, or NULL if the balance was insufficient.
-- Uses auth.uid() so it can only ever spend the caller's own credits.
-- =====================================================================
create or replace function public.deduct_credits(p_amount integer, p_reason text)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_balance integer;
begin
  if uid is null or p_amount <= 0 then
    return null;
  end if;

  update public.profiles
    set credits = credits - p_amount
    where user_id = uid and credits >= p_amount
    returning credits into new_balance;

  if new_balance is null then
    return null; -- insufficient credits (or no profile row)
  end if;

  insert into public.credit_usage (user_id, amount, reason)
  values (uid, -p_amount, p_reason);

  return new_balance;
end;
$$;

grant execute on function public.deduct_credits(integer, text) to authenticated;

-- =====================================================================
-- Row Level Security: each user can only see/modify their own rows.
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.projects            enable row level security;
alter table public.generated_scripts   enable row level security;
alter table public.scenes              enable row level security;
alter table public.videos              enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.credit_usage        enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.crypto_transactions enable row level security;
alter table public.settings            enable row level security;
alter table public.categories          enable row level security;

-- Helper macro pattern: "owner can do everything on their rows".
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','projects','generated_scripts','videos',
    'subscriptions','credit_usage','payment_transactions',
    'crypto_transactions','settings'
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

-- scenes: owner via parent script.
drop policy if exists "scenes_owner" on public.scenes;
create policy "scenes_owner" on public.scenes
  for all using (
    exists (select 1 from public.generated_scripts s
            where s.id = scenes.script_id and s.user_id = auth.uid())
  );

-- categories: readable by everyone (reference data).
drop policy if exists "categories_read" on public.categories;
create policy "categories_read" on public.categories for select using (true);

-- =====================================================================
-- Seed content categories.
-- =====================================================================
insert into public.categories (slug, name, description, emoji) values
  ('horror-stories',       'Horror Stories',        'Spine-chilling narrated horror videos.',         '👻'),
  ('motivational',         'Motivational Videos',   'Inspiring, high-energy motivational clips.',     '🔥'),
  ('anime-stories',        'Anime Stories',         'Anime-styled narrative content.',                '🌸'),
  ('business-marketing',   'Business Marketing',    'Marketing copy and brand storytelling.',         '📈'),
  ('product-ads',          'Product Ads',           'Short, punchy product advertisements.',          '🛍️'),
  ('educational',          'Educational Content',   'Explainers and how-to scripts.',                 '🎓'),
  ('kids-stories',         'Kids Stories',          'Friendly, age-appropriate stories for children.','🧸'),
  ('ai-news',              'AI News',               'Breaking news and updates from the AI world.',   '🤖'),
  ('finance',              'Finance Content',       'Money, markets, and personal-finance scripts.',  '💰'),
  ('relationship-stories', 'Relationship Stories',  'Emotional relationship narratives.',             '💞'),
  ('podcast-scripts',      'Podcast Scripts',       'Long-form conversational podcast outlines.',     '🎙️'),
  ('blog-posts',           'Blog Posts',            'SEO-friendly written blog articles.',            '✍️'),
  ('social-captions',      'Social Media Captions', 'Scroll-stopping captions for any platform.',     '📱')
on conflict (slug) do nothing;

-- =====================================================================
-- Phase 3: AI media generation engine.
-- =====================================================================

-- ---------- extend scenes -------------------------------------------
alter table public.scenes add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.scenes add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.scenes add column if not exists title text;
alter table public.scenes add column if not exists visual_description text;
alter table public.scenes add column if not exists image_prompt text;
alter table public.scenes add column if not exists video_prompt text;
alter table public.scenes add column if not exists camera_direction text;
alter table public.scenes add column if not exists transition text default 'cut';
alter table public.scenes add column if not exists duration integer default 5;
alter table public.scenes add column if not exists video_url text;
alter table public.scenes add column if not exists updated_at timestamptz default now();

create index if not exists idx_scenes_project on public.scenes(project_id);
create index if not exists idx_scenes_user on public.scenes(user_id);

-- ---------- assets (unified media store) ----------------------------
create table if not exists public.assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  type        text not null,                       -- image | audio | video | thumbnail | subtitle
  name        text not null,
  url         text,
  mime_type   text,
  size_bytes  bigint not null default 0,
  provider    text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_assets_user    on public.assets(user_id);
create index if not exists idx_assets_project  on public.assets(project_id);
create index if not exists idx_assets_type     on public.assets(type);

-- ---------- voiceovers ----------------------------------------------
create table if not exists public.voiceovers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  scene_id    uuid references public.scenes(id) on delete set null,
  asset_id    uuid references public.assets(id) on delete set null,
  provider    text not null,
  voice_id    text,
  language    text,
  accent      text,
  speed       numeric(3,2) not null default 1.0,
  pitch       numeric(3,2) not null default 1.0,
  text        text not null,
  audio_url   text,
  duration    numeric(8,2) not null default 0,
  status      text not null default 'ready',
  created_at  timestamptz not null default now()
);
create index if not exists idx_voiceovers_project on public.voiceovers(project_id);
create index if not exists idx_voiceovers_user     on public.voiceovers(user_id);

-- ---------- thumbnails ----------------------------------------------
create table if not exists public.thumbnails (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  asset_id    uuid references public.assets(id) on delete set null,
  title       text,
  style       text not null default 'bold',
  prompt      text,
  image_url   text,
  width       integer not null default 1280,
  height      integer not null default 720,
  status      text not null default 'ready',
  created_at  timestamptz not null default now()
);
create index if not exists idx_thumbnails_project on public.thumbnails(project_id);
create index if not exists idx_thumbnails_user     on public.thumbnails(user_id);

-- ---------- subtitles -----------------------------------------------
create table if not exists public.subtitles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  asset_id    uuid references public.assets(id) on delete set null,
  format      text not null default 'srt',         -- srt | vtt
  content     text not null,
  language    text not null default 'en',
  created_at  timestamptz not null default now()
);
create index if not exists idx_subtitles_project on public.subtitles(project_id);
create index if not exists idx_subtitles_user     on public.subtitles(user_id);

-- ---------- render_jobs ---------------------------------------------
create table if not exists public.render_jobs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete cascade,
  status            text not null default 'queued', -- queued | processing | done | failed
  progress          integer not null default 0,
  estimated_seconds integer not null default 30,
  logs              text not null default '',
  error             text,
  output_url        text,
  provider_job_id   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_render_jobs_project on public.render_jobs(project_id);
create index if not exists idx_render_jobs_user     on public.render_jobs(user_id);

-- ---------- scene_assets (scene <-> asset by role) ------------------
create table if not exists public.scene_assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  scene_id    uuid not null references public.scenes(id) on delete cascade,
  asset_id    uuid not null references public.assets(id) on delete cascade,
  role        text not null,                        -- image | video | voice | subtitle
  created_at  timestamptz not null default now()
);
create index if not exists idx_scene_assets_scene on public.scene_assets(scene_id);
create unique index if not exists idx_scene_assets_role on public.scene_assets(scene_id, role);

-- ---------- media_library (per-user organization layer) -------------
create table if not exists public.media_library (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  asset_id    uuid not null references public.assets(id) on delete cascade,
  tags        text[] not null default '{}',
  favorite    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_media_library_user on public.media_library(user_id);

-- ---------- RLS for the new tables ----------------------------------
alter table public.assets        enable row level security;
alter table public.voiceovers    enable row level security;
alter table public.thumbnails    enable row level security;
alter table public.subtitles     enable row level security;
alter table public.render_jobs   enable row level security;
alter table public.scene_assets  enable row level security;
alter table public.media_library enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'assets','voiceovers','thumbnails','subtitles','render_jobs','scene_assets','media_library'
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

-- scenes: add a direct owner policy on user_id (script-based policy remains).
drop policy if exists "scenes_user_owner" on public.scenes;
create policy "scenes_user_owner" on public.scenes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Phase 6: Social publishing, analytics, automation & teams.
-- (Mirrors supabase/migrations/0006_phase6_publishing.sql)
-- =====================================================================
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

-- =====================================================================
-- Phase 7: Enterprise platform, admin portal & business ops.
-- (Mirrors supabase/migrations/0007_phase7_enterprise.sql)
-- =====================================================================
-- =====================================================================
-- Phase 7 migration: Enterprise platform, admin portal & business ops.
-- Adds 16 tables + profile columns + indexes + RLS. Idempotent.
-- =====================================================================

-- ---------- profile extensions (status / referral) -------------------
alter table public.profiles add column if not exists status text not null default 'active';      -- active | suspended
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references auth.users(id) on delete set null;
create unique index if not exists idx_profiles_referral_code on public.profiles(referral_code) where referral_code is not null;

-- ---------- admin & platform config ----------------------------------
create table if not exists public.admin_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'admin',   -- super_admin | admin | support
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.system_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  description text,
  rollout     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------- referral program -----------------------------------------
create table if not exists public.referrals (
  id               uuid primary key default gen_random_uuid(),
  referrer_id      uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  code             text not null,
  status           text not null default 'pending',  -- pending | converted
  reward_credits   integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
create index if not exists idx_referrals_code on public.referrals(code);

create table if not exists public.referral_rewards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  type        text not null default 'credits',  -- credits | cash
  amount      numeric not null default 0,
  status      text not null default 'pending',  -- pending | granted | paid
  created_at  timestamptz not null default now()
);
create index if not exists idx_referral_rewards_user on public.referral_rewards(user_id);

-- ---------- affiliate program ----------------------------------------
create table if not exists public.affiliate_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  code            text not null unique,
  status          text not null default 'active',   -- pending | active | suspended
  commission_rate numeric not null default 0.30,
  payout_method   text,
  balance         numeric not null default 0,
  created_at      timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.affiliate_clicks (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_accounts(id) on delete cascade,
  ref_code     text not null,
  ip           text,
  user_agent   text,
  landing_path text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_aff_clicks_aff on public.affiliate_clicks(affiliate_id);

create table if not exists public.affiliate_commissions (
  id               uuid primary key default gen_random_uuid(),
  affiliate_id     uuid not null references public.affiliate_accounts(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  amount           numeric not null default 0,
  status           text not null default 'pending',  -- pending | approved | paid
  source           text,                             -- subscription | credit
  created_at       timestamptz not null default now()
);
create index if not exists idx_aff_comm_aff on public.affiliate_commissions(affiliate_id);

-- ---------- API management -------------------------------------------
create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'API key',
  key_prefix    text not null,
  key_hash      text not null,             -- sha256 of the secret; plaintext shown once
  scopes        text[] not null default '{}',
  rate_limit    integer not null default 60,
  request_count integer not null default 0,
  last_used_at  timestamptz,
  revoked       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_api_keys_user on public.api_keys(user_id);
create index if not exists idx_api_keys_prefix on public.api_keys(key_prefix);

-- ---------- support center -------------------------------------------
create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  subject    text not null,
  status     text not null default 'open',     -- open | pending | resolved | closed
  priority   text not null default 'normal',   -- low | normal | high | urgent
  category   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tickets_user on public.support_tickets(user_id);
create index if not exists idx_tickets_status on public.support_tickets(status);

create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  is_staff    boolean not null default false,
  body        text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_messages_ticket on public.support_messages(ticket_id);

-- ---------- audit, monitoring, billing, sessions ---------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  actor_email text,
  action      text not null,
  target_type text,
  target_id   text,
  ip          text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_user on public.audit_logs(user_id);
create index if not exists idx_audit_action on public.audit_logs(action);
create index if not exists idx_audit_time on public.audit_logs(created_at);

create table if not exists public.platform_notifications (
  id         uuid primary key default gen_random_uuid(),
  audience   text not null default 'all',   -- all | admins | user
  user_id    uuid references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  level      text not null default 'info',  -- info | warning | critical
  created_at timestamptz not null default now()
);

create table if not exists public.system_metrics (
  id         uuid primary key default gen_random_uuid(),
  metric     text not null,
  value      numeric not null default 0,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_metrics_metric on public.system_metrics(metric, created_at);

create table if not exists public.billing_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  type        text not null,    -- payment | refund | renewal | chargeback
  amount      numeric not null default 0,
  currency    text not null default 'USD',
  provider    text,
  provider_ref text,
  status      text not null default 'completed',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_billing_user on public.billing_events(user_id);

create table if not exists public.user_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  ip           text,
  user_agent   text,
  last_seen_at timestamptz not null default now(),
  revoked      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_sessions_user on public.user_sessions(user_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.admin_users           enable row level security;
alter table public.system_settings       enable row level security;
alter table public.feature_flags         enable row level security;
alter table public.referrals             enable row level security;
alter table public.referral_rewards      enable row level security;
alter table public.affiliate_accounts    enable row level security;
alter table public.affiliate_clicks      enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.api_keys              enable row level security;
alter table public.support_tickets       enable row level security;
alter table public.support_messages      enable row level security;
alter table public.audit_logs            enable row level security;
alter table public.platform_notifications enable row level security;
alter table public.system_metrics        enable row level security;
alter table public.billing_events        enable row level security;
alter table public.user_sessions         enable row level security;

-- Owner-based policies for user-owned tables.
do $$
declare t text;
begin
  foreach t in array array[
    'referral_rewards','affiliate_accounts','api_keys',
    'support_tickets','user_sessions'
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

-- referrals: the referrer owns the row.
drop policy if exists "referrals_owner" on public.referrals;
create policy "referrals_owner" on public.referrals
  for all using (auth.uid() = referrer_id) with check (auth.uid() = referrer_id);

-- support_messages: visible to the ticket owner (staff/admin use service role).
drop policy if exists "support_messages_owner" on public.support_messages;
create policy "support_messages_owner" on public.support_messages
  for all using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

-- affiliate_commissions: the affiliate owner can read theirs.
drop policy if exists "affiliate_commissions_owner" on public.affiliate_commissions;
create policy "affiliate_commissions_owner" on public.affiliate_commissions
  for select using (
    exists (select 1 from public.affiliate_accounts a where a.id = affiliate_id and a.user_id = auth.uid())
  );

-- audit_logs: a user can read + append their own entries (admin uses service role).
drop policy if exists "audit_owner" on public.audit_logs;
create policy "audit_owner" on public.audit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- feature_flags: world-readable (gates client features).
drop policy if exists "feature_flags_read" on public.feature_flags;
create policy "feature_flags_read" on public.feature_flags for select using (true);

-- platform_notifications: read broadcasts or your own.
drop policy if exists "platform_notifications_read" on public.platform_notifications;
create policy "platform_notifications_read" on public.platform_notifications
  for select using (audience = 'all' or user_id = auth.uid());

-- admin_users, system_settings, affiliate_clicks, system_metrics, billing_events:
-- no permissive policy → only the service-role (admin endpoints) can access.

-- ---------- seed default platform settings + feature flags -----------
insert into public.system_settings (key, value) values
  ('white_label_default', '{"brandName":"CreatorForge AI","brandColor":"#7c3aed","logoUrl":null}'::jsonb),
  ('billing', '{"coupons":[],"creditPackages":[]}'::jsonb)
on conflict (key) do nothing;

insert into public.feature_flags (key, enabled, description) values
  ('affiliate_program', true,  'Affiliate center enabled'),
  ('referral_program',  true,  'Referral program enabled'),
  ('white_label',       false, 'White-label customization enabled')
on conflict (key) do nothing;
