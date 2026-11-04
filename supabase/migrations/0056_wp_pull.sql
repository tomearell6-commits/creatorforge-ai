-- =====================================================================
-- Pull delivery for WordPress sites whose host blocks our publisher (captcha / firewall).
-- Instead of CreatorsForge pushing a post INTO the site, a small plugin on the site asks CreatorsForge
-- for the next finished article and creates the post itself. Nothing has to get through the host's firewall.
--   * wordpress_sites.delivery      'push' (default, the old way) or 'pull'
--   * wordpress_sites.pull_token_hash   sha256 of the plugin's secret (the secret itself is shown once, never stored)
--   * wp_pull_queue                  finished articles waiting for (or already collected by) the plugin
-- Idempotent: safe to run more than once.
-- =====================================================================

alter table public.wordpress_sites add column if not exists delivery text not null default 'push';
alter table public.wordpress_sites drop constraint if exists wordpress_sites_delivery_check;
alter table public.wordpress_sites add constraint wordpress_sites_delivery_check check (delivery in ('push', 'pull'));
alter table public.wordpress_sites add column if not exists pull_token_hash text;
alter table public.wordpress_sites add column if not exists last_pull_at timestamptz;

create table if not exists public.wp_pull_queue (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  wordpress_site_id  uuid not null references public.wordpress_sites(id) on delete cascade,
  autopost_site_id   uuid references public.seo_autopost_sites(id) on delete set null,
  article_id         uuid references public.seo_articles(id) on delete set null,
  payload            jsonb not null,
  status             text not null default 'pending' check (status in ('pending', 'delivering', 'delivered', 'failed')),
  attempts           integer not null default 0,
  lease_until        timestamptz,
  post_id            text,
  post_url           text,
  error              text,
  created_at         timestamptz not null default now(),
  delivered_at       timestamptz
);
create index if not exists idx_wp_pull_queue_site on public.wp_pull_queue(wordpress_site_id, status, created_at);

alter table public.wp_pull_queue enable row level security;
drop policy if exists wp_pull_queue_owner on public.wp_pull_queue;
create policy wp_pull_queue_owner on public.wp_pull_queue for select using (auth.uid() = user_id);
-- Rows are written by the server (service role) only.
