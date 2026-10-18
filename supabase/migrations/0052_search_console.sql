-- =====================================================================
-- SEO Results: read-only Google Search Console connection.
-- One row per connected Google account (a user may connect several: their sites are
-- often verified under different accounts). Tokens are stored ENCRYPTED by the server
-- and are never sent to the browser. The cache keeps Search Console answers for a few
-- hours so the dashboard is fast and the API quota is not wasted.
-- Idempotent: safe to run more than once.
-- =====================================================================

create table if not exists public.gsc_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  google_email  text not null,
  refresh_token text not null,
  access_token  text,
  expires_at    timestamptz,
  scope         text,
  status        text not null default 'connected' check (status in ('connected', 'expired')),
  last_error    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, google_email)
);
create index if not exists idx_gsc_connections_user on public.gsc_connections(user_id);

create table if not exists public.gsc_cache (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  cache_key  text not null,
  payload    jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (user_id, kind, cache_key)
);

alter table public.gsc_connections enable row level security;
alter table public.gsc_cache enable row level security;

-- Owners may see and remove their own connections. Writes of tokens happen server-side.
drop policy if exists gsc_connections_owner on public.gsc_connections;
create policy gsc_connections_owner on public.gsc_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists gsc_cache_owner on public.gsc_cache;
create policy gsc_cache_owner on public.gsc_cache
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
