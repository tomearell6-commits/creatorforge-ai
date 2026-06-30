-- =====================================================================
-- Tutorials library (admin-managed video lessons, public read).
-- Powers the public /tutorials page so visitors can learn how the app works.
-- Idempotent: safe to re-run.
-- =====================================================================

create table if not exists public.tutorials (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  category      text not null default 'Getting Started',
  video_url     text not null,
  thumbnail_url text,
  duration      text,                         -- e.g. '2:14'
  level         text default 'beginner',      -- beginner | intermediate | advanced
  sort_order    integer not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_tutorials_pub on public.tutorials(is_published, category, sort_order);

alter table public.tutorials enable row level security;

drop policy if exists "tutorials_public_read" on public.tutorials;
create policy "tutorials_public_read" on public.tutorials
  for select using (is_published = true);

-- Seed the rendered explainer + stitched walkthrough (hosted in Supabase storage).
insert into public.tutorials (title, description, category, video_url, duration, level, sort_order)
select 'Full walkthrough — how CreatorForge works',
       'A guided end-to-end demo of the platform, branded and narrated.',
       'Getting Started',
       'https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/full-walkthrough.mp4',
       '0:25', 'beginner', 1
where not exists (select 1 from public.tutorials where title = 'Full walkthrough — how CreatorForge works');

insert into public.tutorials (title, description, category, video_url, duration, level, sort_order)
select 'How CreatorForge works — overview',
       'A quick end-to-end tour: from a single prompt to a finished, published video.',
       'Getting Started',
       'https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/marketing/demo.mp4',
       '0:21', 'beginner', 2
where not exists (select 1 from public.tutorials where title = 'How CreatorForge works — overview');
