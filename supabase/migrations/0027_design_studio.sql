-- =====================================================================
-- CreatorsForge Design Studio (Content Studio).
--
-- A professional design workspace: projects → editable layers → AI concepts →
-- brand kits → versions → exports, plus live AI footage / video-graphic
-- concepts. Owner-only RLS on every user table; a shared design_templates
-- catalogue is world-readable but only writable by the service role (admin).
-- Idempotent — safe to re-run.
-- =====================================================================

-- ---- Design projects ----------------------------------------------------
create table if not exists public.design_projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid,
  title         text not null default 'Untitled design',
  category      text,                              -- category slug (designStudio.ts)
  format        text,                              -- format id (e.g. square-1-1)
  width         integer not null default 1080,
  height        integer not null default 1080,
  style         text,                              -- style id (minimal|luxury|...)
  status        text not null default 'draft',     -- draft | generated | edited | exported | archived
  thumbnail_url text,
  brand_kit_id  uuid,
  template_id   uuid,
  goal          text,
  concept_json  jsonb,                             -- last AI concept (DesignConcept)
  credits_used  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_design_projects_user on public.design_projects(user_id, updated_at desc);
create index if not exists idx_design_projects_status on public.design_projects(user_id, status);

-- ---- Design layers (the editable canvas model) --------------------------
create table if not exists public.design_layers (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.design_projects(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  layer_type    text not null default 'text',      -- text|image|shape|icon|background|video|audio|animation|overlay
  layer_name    text not null default 'Layer',
  position_x    numeric not null default 0,
  position_y    numeric not null default 0,
  width         numeric not null default 200,
  height        numeric not null default 80,
  rotation      numeric not null default 0,
  opacity       numeric not null default 1,        -- 0..1
  z_index       integer not null default 0,
  style_json    jsonb not null default '{}'::jsonb, -- color, font, fill, gradient, effects...
  content_json  jsonb not null default '{}'::jsonb, -- text value, image url, shape kind...
  locked        boolean not null default false,
  visible       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_design_layers_project on public.design_layers(project_id, z_index);
create index if not exists idx_design_layers_user on public.design_layers(user_id);

-- ---- Design assets (uploaded / generated images used in designs) --------
create table if not exists public.design_assets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  project_id    uuid references public.design_projects(id) on delete set null,
  asset_type    text not null default 'image',     -- image | background | icon | video | upload
  name          text,
  url           text not null,
  mime_type     text,
  width         integer,
  height        integer,
  bytes         integer,
  source        text not null default 'upload',     -- upload | ai | template | stock
  prompt        text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_design_assets_user on public.design_assets(user_id, created_at desc);
create index if not exists idx_design_assets_project on public.design_assets(project_id);

-- ---- Design versions (saved snapshots for undo/history) -----------------
create table if not exists public.design_versions (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.design_projects(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  version_number integer not null default 1,
  label         text,
  layers_json   jsonb not null default '[]'::jsonb, -- full layer snapshot
  thumbnail_url text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_design_versions_project on public.design_versions(project_id, version_number desc);

-- ---- Design exports -----------------------------------------------------
create table if not exists public.design_exports (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.design_projects(id) on delete set null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  format        text not null default 'png',        -- png | jpg | pdf | svg | mp4 | gif | zip
  status        text not null default 'ready',      -- ready | processing | failed
  url           text,
  width         integer,
  height        integer,
  bytes         integer,
  credits_used  integer not null default 0,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_design_exports_user on public.design_exports(user_id, created_at desc);
create index if not exists idx_design_exports_project on public.design_exports(project_id);

-- ---- Brand design kits --------------------------------------------------
create table if not exists public.brand_design_kits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'My Brand Kit',
  logo_url      text,
  colors        text[] not null default '{}',       -- hex values
  fonts         text[] not null default '{}',
  tone          text,
  brand_description text,
  image_style   text,
  cta_style     text,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_brand_design_kits_user on public.brand_design_kits(user_id, created_at desc);

-- ---- Design generation jobs (audit/telemetry for AI concept gen) --------
create table if not exists public.design_generation_jobs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  project_id    uuid references public.design_projects(id) on delete set null,
  job_type      text not null default 'concept',    -- concept | background | image | prompt | footage
  status        text not null default 'completed',  -- queued | running | completed | failed
  input_json    jsonb not null default '{}'::jsonb,
  output_json   jsonb,
  used_ai       boolean not null default false,
  credits_used  integer not null default 0,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_design_gen_jobs_user on public.design_generation_jobs(user_id, created_at desc);

-- ---- Video graphic concepts (Live AI Footage Designer output) -----------
create table if not exists public.video_graphic_concepts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  project_id    uuid references public.design_projects(id) on delete set null,
  title         text not null default 'Untitled footage concept',
  scene_idea    text,
  subject       text,
  camera_style  text,
  lighting      text,
  background    text,
  motion_style  text,
  platform      text,
  duration      integer,
  aspect_ratio  text,
  concept_json  jsonb,                              -- FootageConcept (prompt, shot list, script...)
  credits_used  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_video_graphic_concepts_user on public.video_graphic_concepts(user_id, created_at desc);

-- ---- Design templates (SHARED catalogue: world-read, admin-write) --------
create table if not exists public.design_templates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  category          text,                           -- category slug
  format            text,
  width             integer not null default 1080,
  height            integer not null default 1080,
  preview_url       text,
  layers_json       jsonb not null default '[]'::jsonb,
  brand_compatible  boolean not null default true,
  credits_required  integer not null default 0,
  supported_exports text[] not null default '{png,jpg,pdf}',
  tags              text[] not null default '{}',
  difficulty        text not null default 'beginner', -- beginner | intermediate | advanced
  industry          text,
  style             text,
  is_premium        boolean not null default false,
  is_featured       boolean not null default false,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_design_templates_active on public.design_templates(is_active, sort_order);
create index if not exists idx_design_templates_category on public.design_templates(category);

-- ---- Owner-only RLS on every user table ---------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'design_projects','design_layers','design_assets','design_versions',
    'design_exports','brand_design_kits','design_generation_jobs','video_graphic_concepts'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_own') then
      execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_own', t);
    end if;
  end loop;
end $$;

-- design_templates: shared catalogue. RLS on, world-readable active rows,
-- writes only via the service role (admin endpoints bypass RLS).
alter table public.design_templates enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'design_templates' and policyname = 'design_templates_read') then
    create policy design_templates_read on public.design_templates for select using (is_active = true);
  end if;
end $$;
