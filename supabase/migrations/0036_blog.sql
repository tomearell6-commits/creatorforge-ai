-- 0036_blog.sql — Native marketing blog for creatorsforge.io
-- Public, SEO-indexable articles published from the admin dashboard (AI-written
-- via the existing SEO Content Studio generator) and auto-published on schedule.
-- RLS: anyone may read PUBLISHED posts; all writes are service-role/admin only
-- (no insert/update/delete policy → only the service role, which bypasses RLS).

create table if not exists public.blog_posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  meta_title       text,
  meta_description text,
  excerpt          text,
  content_html     text not null default '',
  cover_image_url  text,
  cover_image_alt  text,
  tags             text[] not null default '{}',
  category         text,
  focus_keyword    text,
  faq_json         jsonb not null default '[]'::jsonb,
  status           text not null default 'draft' check (status in ('draft','scheduled','published')),
  scheduled_for    timestamptz,
  published_at     timestamptz,
  author           text not null default 'CreatorsForge Team',
  source           text not null default 'manual' check (source in ('manual','ai','autopilot')),
  reading_minutes  int not null default 3,
  seo_score        int,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists blog_posts_status_pub_idx on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_scheduled_idx  on public.blog_posts (status, scheduled_for);
create index if not exists blog_posts_slug_idx        on public.blog_posts (slug);

alter table public.blog_posts enable row level security;

-- Public read of published posts only. Drafts/scheduled stay invisible to anon.
drop policy if exists blog_posts_public_read on public.blog_posts;
create policy blog_posts_public_read on public.blog_posts
  for select
  using (status = 'published');

-- Keep updated_at fresh.
create or replace function public.blog_posts_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch
  before update on public.blog_posts
  for each row execute function public.blog_posts_touch_updated_at();
