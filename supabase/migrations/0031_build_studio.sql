-- =====================================================================
-- Build Studio — AI Website & App Builder (Business Studio).
--
-- Turns an idea into a structured digital-product plan: project package
-- (positioning, structure, copy, features, user flow, sitemap, tech stack),
-- development roadmap, marketing launch plan, app spec, and export briefs.
-- HONESTY RULE: Build Studio produces professional PLANS and BRIEFS — it
-- does not deploy running applications.
--
-- Owner-only RLS on user tables; build_templates is a shared catalogue
-- (world-read active rows, service-role/admin writes). Idempotent.
-- =====================================================================

create table if not exists public.build_projects (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null default 'Untitled project',
  category       text,                              -- group id (website|ecommerce|landing|webapp|mobile|funnel)
  project_type   text,                              -- type slug (e.g. saas-app)
  idea           text,
  target_audience text,
  goal           text,                              -- sales|leads|subscriptions|bookings|downloads|community|education|brand
  style          text,
  status         text not null default 'draft',     -- draft | generated | edited | exported | archived
  package_json   jsonb,                             -- full BuildPackage (latest)
  credits_used   integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_build_projects_user on public.build_projects(user_id, updated_at desc);

create table if not exists public.build_project_pages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.build_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  page_name   text not null,
  purpose     text,
  sections    jsonb not null default '[]'::jsonb,   -- ordered section outline
  copy_json   jsonb not null default '{}'::jsonb,   -- headline/subhead/body/cta per page
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_build_pages_project on public.build_project_pages(project_id, sort_order);

create table if not exists public.build_project_features (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.build_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  priority    text not null default 'must',         -- must | should | later
  phase       integer not null default 1,
  sort_order  integer not null default 0
);
create index if not exists idx_build_features_project on public.build_project_features(project_id, phase, sort_order);

create table if not exists public.build_project_roadmaps (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.build_projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  roadmap_json jsonb not null default '[]'::jsonb,  -- phases: [{phase,title,weeks,items[]}]
  created_at   timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.build_marketing_plans (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.build_projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  plan_json  jsonb not null default '{}'::jsonb,    -- launch phases, channels, seo keywords, blog topics
  created_at timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.build_app_specs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.build_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  spec_json   jsonb not null default '{}'::jsonb,   -- auth flow, roles, schema, api routes, tech stack
  created_at  timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.build_project_exports (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.build_projects(id) on delete set null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  format       text not null default 'markdown',    -- pdf | docx | markdown | copy_package | sitemap | wireframe | schema | marketing | prompt_package
  credits_used integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_build_exports_user on public.build_project_exports(user_id, created_at desc);

-- Shared template catalogue (admin-extendable; built-ins ship in code).
create table if not exists public.build_templates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  category          text,
  project_type      text,
  description       text,
  default_idea      text,
  estimated_credits integer not null default 20,
  tags              text[] not null default '{}',
  is_premium        boolean not null default false,
  is_featured       boolean not null default false,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_build_templates_active on public.build_templates(is_active, sort_order);

-- ---- RLS -----------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'build_projects','build_project_pages','build_project_features',
    'build_project_roadmaps','build_marketing_plans','build_app_specs','build_project_exports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_own') then
      execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_own', t);
    end if;
  end loop;
end $$;

alter table public.build_templates enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'build_templates' and policyname = 'build_templates_read') then
    create policy build_templates_read on public.build_templates for select using (is_active = true);
  end if;
end $$;
