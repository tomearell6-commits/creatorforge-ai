-- 0043_build_sites.sql — Website hosting for Build Studio.
--
-- A build_sites row is a PUBLISHED static website generated from a
-- build_projects blueprint. The generated files live in Supabase Storage and are
-- served from the storage origin (NOT creatorsforge.io) so user-generated HTML
-- can never be same-origin with the app (no cookie/session access).

create table if not exists public.build_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.build_projects(id) on delete cascade,

  slug text not null unique,
  title text not null,
  template text not null default 'modern',

  -- draft | published | unpublished | removed (removed = admin takedown)
  status text not null default 'draft',
  live_url text,
  storage_path text,
  page_count int not null default 0,
  bytes int not null default 0,

  -- Admin takedown trail (abuse handling).
  removed_reason text,
  removed_at timestamptz,

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists build_sites_user_idx on public.build_sites(user_id);
create index if not exists build_sites_project_idx on public.build_sites(project_id);
create index if not exists build_sites_status_idx on public.build_sites(status);

alter table public.build_sites enable row level security;

-- Owner-only access; admins go through the service role.
drop policy if exists build_sites_select_own on public.build_sites;
create policy build_sites_select_own on public.build_sites
  for select using (auth.uid() = user_id);

drop policy if exists build_sites_insert_own on public.build_sites;
create policy build_sites_insert_own on public.build_sites
  for insert with check (auth.uid() = user_id);

drop policy if exists build_sites_update_own on public.build_sites;
create policy build_sites_update_own on public.build_sites
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists build_sites_delete_own on public.build_sites;
create policy build_sites_delete_own on public.build_sites
  for delete using (auth.uid() = user_id);
