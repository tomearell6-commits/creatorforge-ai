-- =====================================================================
-- Professional Industry Suites + Real Estate & Architecture Suite.
--
-- industry_suites/categories/templates are SHARED catalogues (world-read
-- active rows, service-role/admin writes) mirroring design_templates. The
-- real_estate_* tables are owner-RLS user data. The built-in suite/category/
-- template definitions ship in code (src/config/industrySuites.ts); these
-- tables let admins extend them without a deploy. Idempotent.
-- =====================================================================

-- ---- Industry suites (catalogue) -----------------------------------------
create table if not exists public.industry_suites (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  icon        text,
  status      text not null default 'coming_soon',  -- active | coming_soon | hidden
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.industry_suite_categories (
  id          uuid primary key default gen_random_uuid(),
  suite_id    uuid not null references public.industry_suites(id) on delete cascade,
  name        text not null,
  slug        text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (suite_id, slug)
);
create index if not exists idx_suite_categories_suite on public.industry_suite_categories(suite_id, sort_order);

create table if not exists public.industry_templates (
  id                   uuid primary key default gen_random_uuid(),
  industry_suite_id    uuid references public.industry_suites(id) on delete cascade,
  category_id          uuid references public.industry_suite_categories(id) on delete set null,
  name                 text not null,
  slug                 text not null,
  description          text,
  output_type          text not null default 'concept_prompt',
  required_inputs_json jsonb not null default '[]'::jsonb,
  default_prompt       text,
  preview_url          text,
  estimated_credits    integer not null default 8,
  export_formats_json  jsonb not null default '["png","jpg","pdf"]'::jsonb,
  tags_json            jsonb not null default '[]'::jsonb,
  is_premium           boolean not null default false,
  is_featured          boolean not null default false,
  is_active            boolean not null default true,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_industry_templates_suite on public.industry_templates(industry_suite_id, sort_order);
create index if not exists idx_industry_templates_active on public.industry_templates(is_active);

-- ---- Real estate projects (user data) ------------------------------------
create table if not exists public.real_estate_projects (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  design_project_id uuid references public.design_projects(id) on delete set null,
  project_name   text not null default 'Untitled property project',
  project_type   text,                         -- residential | commercial | mixed-use | ...
  property_type  text,                         -- villa | apartment | office | ...
  country        text,
  city           text,
  climate        text,
  plot_size      text,
  floors         integer,
  bedrooms       integer,
  bathrooms      integer,
  design_style   text,
  budget         text,
  target_market  text,
  interior_style text,
  exterior_style text,
  roof_style     text,
  materials      text,
  landscape_preference text,
  brand_name     text,
  output_type    text not null default 'concept_prompt',
  status         text not null default 'draft', -- draft | generated | exported | archived
  credits_used   integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_re_projects_user on public.real_estate_projects(user_id, updated_at desc);

-- ---- Structured AI outputs per project -----------------------------------
create table if not exists public.real_estate_design_outputs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  project_id   uuid references public.real_estate_projects(id) on delete cascade,
  output_type  text not null default 'concept_prompt',
  concept_json jsonb not null default '{}'::jsonb,  -- RealEstateConcept
  used_ai      boolean not null default false,
  credits_used integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_re_outputs_project on public.real_estate_design_outputs(project_id, created_at desc);
create index if not exists idx_re_outputs_user on public.real_estate_design_outputs(user_id, created_at desc);

-- ---- AI property walkthrough concepts ------------------------------------
create table if not exists public.real_estate_walkthroughs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  project_id     uuid references public.real_estate_projects(id) on delete set null,
  title          text not null default 'Untitled walkthrough',
  property_type  text,
  features       text,
  camera_style   text,
  lighting_style text,
  music_style    text,
  voiceover_style text,
  duration       integer,
  aspect_ratio   text,
  platform       text,
  concept_json   jsonb,                        -- WalkthroughConcept
  credits_used   integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists idx_re_walkthroughs_user on public.real_estate_walkthroughs(user_id, created_at desc);

-- ---- Real estate exports --------------------------------------------------
create table if not exists public.real_estate_exports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  project_id   uuid references public.real_estate_projects(id) on delete set null,
  format       text not null default 'pdf',    -- png | jpg | pdf | presentation | storyboard | prompt_package | zip
  status       text not null default 'ready',
  url          text,
  credits_used integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_re_exports_user on public.real_estate_exports(user_id, created_at desc);

-- ---- RLS ------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'real_estate_projects','real_estate_design_outputs',
    'real_estate_walkthroughs','real_estate_exports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_own') then
      execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_own', t);
    end if;
  end loop;
end $$;

-- Shared catalogues: world-read of visible rows, service-role writes.
alter table public.industry_suites enable row level security;
alter table public.industry_suite_categories enable row level security;
alter table public.industry_templates enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'industry_suites' and policyname = 'industry_suites_read') then
    create policy industry_suites_read on public.industry_suites for select using (status <> 'hidden');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'industry_suite_categories' and policyname = 'industry_suite_categories_read') then
    create policy industry_suite_categories_read on public.industry_suite_categories for select using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'industry_templates' and policyname = 'industry_templates_read') then
    create policy industry_templates_read on public.industry_templates for select using (is_active = true);
  end if;
end $$;

-- ---- Seed the 13 suites (idempotent on slug) ------------------------------
insert into public.industry_suites (name, slug, description, icon, status, sort_order) values
  ('Real Estate & Architecture', 'real-estate-architecture', 'Property marketing, architectural concepts, floor plans, interiors, walkthroughs.', 'Building2', 'active', 1),
  ('Ecommerce Design',           'ecommerce-design',          'Product visuals, store banners, promos and marketplace creatives.', 'ShoppingBag', 'coming_soon', 2),
  ('Restaurant & Hospitality',   'restaurant-hospitality',    'Menus, food photography concepts, promos and venue branding.', 'UtensilsCrossed', 'coming_soon', 3),
  ('Healthcare',                 'healthcare',                'Clinic branding, patient materials and health campaign visuals.', 'HeartPulse', 'coming_soon', 4),
  ('Education',                  'education',                 'Course covers, school branding and learning materials.', 'GraduationCap', 'coming_soon', 5),
  ('Legal',                      'legal',                     'Law firm branding, proposals and client documents.', 'Scale', 'coming_soon', 6),
  ('Finance',                    'finance',                   'Financial branding, investor decks and report visuals.', 'Landmark', 'coming_soon', 7),
  ('Construction',               'construction',              'Site branding, project profiles and construction reports.', 'HardHat', 'coming_soon', 8),
  ('Automotive',                 'automotive',                'Dealership creatives, vehicle promos and brand kits.', 'Car', 'coming_soon', 9),
  ('Fashion & Beauty',           'fashion-beauty',            'Lookbooks, campaign visuals and salon branding.', 'Sparkles', 'coming_soon', 10),
  ('Travel & Tourism',           'travel-tourism',            'Destination promos, tour brochures and travel social content.', 'Plane', 'coming_soon', 11),
  ('Event Management',           'event-management',          'Event branding, invitations, posters and recap visuals.', 'CalendarDays', 'coming_soon', 12),
  ('Manufacturing',              'manufacturing',             'Industrial branding, product sheets and capability decks.', 'Factory', 'coming_soon', 13)
on conflict (slug) do nothing;
