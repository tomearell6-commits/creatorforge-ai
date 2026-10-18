-- =====================================================================
-- Refresh older posts: every rewrite of a CreatorsForge blog post is kept as a revision.
-- The new version is a DRAFT until the platform owner approves it; applying it stores the
-- previous version in the same row so it can be restored with one click (undo).
-- Service-role only (no RLS policies): the admin API routes are the only writers/readers.
-- Idempotent: safe to run more than once.
-- =====================================================================

create table if not exists public.blog_post_revisions (
  id                  uuid primary key default gen_random_uuid(),
  post_id             uuid not null references public.blog_posts(id) on delete cascade,
  created_by          uuid not null,
  status              text not null default 'draft' check (status in ('draft', 'applied', 'undone', 'discarded')),

  new_html            text not null,
  new_faq             jsonb not null default '[]'::jsonb,
  new_excerpt         text,
  new_reading_minutes int,
  new_seo_score       int,
  new_words           int not null default 0,

  old_html            text not null,
  old_faq             jsonb not null default '[]'::jsonb,
  old_excerpt         text,
  old_reading_minutes int,
  old_seo_score       int,
  old_words           int not null default 0,

  created_at          timestamptz not null default now(),
  applied_at          timestamptz,
  undone_at           timestamptz
);
create index if not exists idx_blog_post_revisions_post on public.blog_post_revisions(post_id, created_at desc);

alter table public.blog_post_revisions enable row level security;
