-- 0038_wp_seo_fixer.sql — WordPress SEO Auto-Fix (review & approve)
-- Logs every SEO fix the AI applies to a user's connected WordPress site, for
-- transparency + reversibility. Owner-RLS. Uses existing wordpress_sites for
-- the connection; touches no existing table.

create table if not exists public.wordpress_seo_fixes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  site_id         uuid not null,
  post_id         text not null,
  post_type       text not null default 'post',   -- 'post' | 'page'
  post_url        text,
  fix_type        text not null check (fix_type in ('meta_title','meta_description')),
  before_value    text,
  after_value     text,
  status          text not null default 'applied' check (status in ('applied','failed')),
  credits_charged int  not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists wp_seo_fixes_user_idx on public.wordpress_seo_fixes (user_id, created_at desc);
create index if not exists wp_seo_fixes_site_idx on public.wordpress_seo_fixes (site_id, created_at desc);

alter table public.wordpress_seo_fixes enable row level security;
drop policy if exists wp_seo_fixes_own on public.wordpress_seo_fixes;
create policy wp_seo_fixes_own on public.wordpress_seo_fixes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
