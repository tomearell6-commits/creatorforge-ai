-- 0037_browser_studio.sql — Browser Studio (Website Workspace)
-- Server-side URL inspection workspace: bookmarks, history, saved inspections,
-- and screenshots (screenshots table ready; capture activates when a rendering
-- API is configured). All owner-RLS. Does not touch any existing table.

create table if not exists public.browser_bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  url        text not null,
  title      text,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists browser_bookmarks_user_idx on public.browser_bookmarks (user_id, created_at desc);

create table if not exists public.browser_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  url        text not null,
  title      text,
  seo_score  int,
  visited_at timestamptz not null default now()
);
create index if not exists browser_history_user_idx on public.browser_history (user_id, visited_at desc);

create table if not exists public.browser_inspections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  url        text not null,
  score      int,
  report     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists browser_inspections_user_idx on public.browser_inspections (user_id, created_at desc);

create table if not exists public.browser_screenshots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  url        text not null,
  kind       text not null default 'full' check (kind in ('full','viewport','region')),
  image_url  text not null,
  width      int,
  height     int,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists browser_screenshots_user_idx on public.browser_screenshots (user_id, created_at desc);

-- Owner RLS on all four.
do $$
declare t text;
begin
  foreach t in array array['browser_bookmarks','browser_history','browser_inspections','browser_screenshots']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format('create policy %I_own on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
  end loop;
end $$;
