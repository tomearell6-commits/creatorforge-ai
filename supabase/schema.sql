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
