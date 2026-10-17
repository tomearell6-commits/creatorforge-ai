-- =====================================================================
-- SEO Auto-Poster — fully automatic daily publishing to a connected
-- WordPress site (1 or 2 posts/day, no date/time setup by the user).
-- Idempotent: safe to run more than once.
-- =====================================================================

-- One row per auto-posted site (a connected WordPress site + its settings).
create table if not exists public.seo_autopost_sites (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  wordpress_site_id    uuid not null references public.wordpress_sites(id) on delete cascade,
  active               boolean not null default true,
  niche                text not null,                                   -- what the site is about (user input)
  posts_per_day        smallint not null default 1 check (posts_per_day between 1 and 2),
  audience             text not null default 'worldwide',
  language             text not null default 'en',
  min_words            integer not null default 1500 check (min_words between 800 and 4000),
  publish_hours        smallint[] not null default '{9,16}',            -- UTC hours, assigned automatically
  topic_queue          jsonb not null default '[]'::jsonb,              -- planned topics still to write
  research             jsonb not null default '{}'::jsonb,              -- site + competitor research summary
  last_research_at     timestamptz,
  claimed_at           timestamptz,                                     -- run lock (prevents double runs)
  last_run_at          timestamptz,
  last_success_at      timestamptz,
  posts_published      integer not null default 0,
  consecutive_failures integer not null default 0,
  paused_reason        text,                                            -- why it stopped / is waiting
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (wordpress_site_id)
);
create index if not exists idx_seo_autopost_user   on public.seo_autopost_sites(user_id);
create index if not exists idx_seo_autopost_active on public.seo_autopost_sites(active, last_run_at);

-- One row per run attempt (what happened, at which stage, how much it cost).
create table if not exists public.seo_autopost_log (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  site_id          uuid not null references public.seo_autopost_sites(id) on delete cascade,
  article_id       uuid references public.seo_articles(id) on delete set null,
  status           text not null,            -- published | failed | skipped
  stage            text,                     -- connection | credits | topic | image | article | publish
  message          text,
  title            text,
  post_url         text,
  words            integer,
  credits_charged  integer not null default 0,
  duration_ms      integer,
  created_at       timestamptz not null default now()
);
create index if not exists idx_seo_autopost_log_site on public.seo_autopost_log(site_id, created_at desc);
create index if not exists idx_seo_autopost_log_user on public.seo_autopost_log(user_id, created_at desc);

-- Mark where an article came from, and which auto-poster produced it.
alter table public.seo_articles add column if not exists source text not null default 'manual';
alter table public.seo_articles add column if not exists autopost_site_id uuid references public.seo_autopost_sites(id) on delete set null;

-- RLS: owners manage their own settings; the log is read-only for owners
-- (written by the service-role cron).
alter table public.seo_autopost_sites enable row level security;
alter table public.seo_autopost_log   enable row level security;

drop policy if exists "seo_autopost_sites_owner" on public.seo_autopost_sites;
create policy "seo_autopost_sites_owner" on public.seo_autopost_sites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "seo_autopost_log_owner_read" on public.seo_autopost_log;
create policy "seo_autopost_log_owner_read" on public.seo_autopost_log
  for select using (auth.uid() = user_id);
