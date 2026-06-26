-- =====================================================================
-- Phase 3 migration: AI media generation engine.
-- Adds media tables, extends scenes, and applies RLS + indexes.
-- Run against a database created from schema.sql (v1 + 0002).
-- Fresh installs already include all of this via schema.sql.
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
