-- =====================================================================
-- Guided Tours for Forge AI Assistant.
--
-- The interactive step content (selectors/copy) lives in code
-- (src/lib/tours/tours.ts) so the overlay can target data-tour attributes.
-- These tables provide the catalogue + per-user progress persistence.
-- Guided tours never cost credits.
--
-- Idempotent: safe to re-run.
-- =====================================================================

create table if not exists public.guided_tours (
  id          text primary key,          -- e.g. 'create-first-video'
  title       text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.guided_tour_steps (
  id          uuid primary key default gen_random_uuid(),
  tour_id     text not null references public.guided_tours(id) on delete cascade,
  step_order  integer not null default 0,
  target      text,                      -- data-tour attribute the step highlights
  title       text not null,
  body        text,
  href        text,                      -- page the step lives on
  created_at  timestamptz not null default now()
);
create index if not exists idx_guided_tour_steps on public.guided_tour_steps(tour_id, step_order);

create table if not exists public.user_tour_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  tour_id      text not null,
  current_step integer not null default 0,
  completed    boolean not null default false,
  skipped      boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, tour_id)
);
create index if not exists idx_user_tour_progress on public.user_tour_progress(user_id);

-- =====================================================================
-- RLS: catalogue is world-readable; progress is owner-only.
-- =====================================================================
alter table public.guided_tours        enable row level security;
alter table public.guided_tour_steps   enable row level security;
alter table public.user_tour_progress  enable row level security;

drop policy if exists "guided_tours_read" on public.guided_tours;
create policy "guided_tours_read" on public.guided_tours for select using (true);

drop policy if exists "guided_tour_steps_read" on public.guided_tour_steps;
create policy "guided_tour_steps_read" on public.guided_tour_steps for select using (true);

drop policy if exists "user_tour_progress_owner" on public.user_tour_progress;
create policy "user_tour_progress_owner" on public.user_tour_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Seed the tour catalogue (step content is in code; this is the index).
-- =====================================================================
insert into public.guided_tours (id, title, description, sort_order) values
  ('create-first-video', 'Create Your First Video', 'From idea to rendered MP4.', 1),
  ('ai-shorts',          'Generate AI Shorts',      'Make a short-form vertical video.', 2),
  ('product-ad',         'Create a Product Ad',     'Turn a product into an ad.', 3),
  ('seo-blog-post',      'Generate an SEO Blog Post','Write & publish an SEO article.', 4),
  ('connect-wordpress',  'Connect WordPress',       'Link a site for auto-publishing.', 5),
  ('connect-social',     'Connect a Social Account','Authorize a publishing platform.', 6),
  ('render-export',      'Render & Export Video',   'Render a project to MP4.', 7),
  ('top-up-credits',     'Top Up Credits',          'Buy more credits with crypto.', 8),
  ('schedule-content',   'Schedule Content',        'Plan posts on the calendar.', 9),
  ('use-templates',      'Use Templates',           'Start from a preset.', 10)
on conflict (id) do nothing;
