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

-- Seed the rendered tutorials (hosted in Supabase storage).
insert into public.tutorials (title, description, category, video_url, duration, level, sort_order)
select 'Meet CreatorForge — guided by your AI host',
       'An AI presenter walks you through what CreatorForge does and how to get started.',
       'Getting Started',
       'https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/avatar-overview.mp4',
       '0:45', 'beginner', 0
where not exists (select 1 from public.tutorials where title = 'Meet CreatorForge — guided by your AI host');

insert into public.tutorials (title, description, category, video_url, duration, level, sort_order)
select 'Full walkthrough — how CreatorForge works',
       'A guided end-to-end demo of the platform, branded and narrated.',
       'Getting Started',
       'https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/full-walkthrough.mp4',
       '0:25', 'beginner', 1
where not exists (select 1 from public.tutorials where title = 'Full walkthrough — how CreatorForge works');

-- AI avatar lesson set (HeyGen-rendered, rehosted to Supabase storage).
insert into public.tutorials (title, description, category, video_url, duration, level, sort_order)
select * from (values
  ('Create your first AI video','From a prompt to script, scenes, voiceover, visuals and a rendered MP4.','Create','https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/lesson-create-video.mp4','0:30','beginner',3),
  ('Generate an SEO blog post','Write an optimized article and publish it to WordPress.','SEO','https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/lesson-seo-blog.mp4','0:25','beginner',4),
  ('Run an SEO audit','Score your site and get a prioritized fix plan.','SEO','https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/lesson-seo-audit.mp4','0:25','beginner',5),
  ('Connect your accounts','Link social platforms and WordPress before publishing.','Publishing','https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/lesson-connect.mp4','0:20','beginner',6),
  ('Credits & crypto top-ups','How credits work and how to top up with crypto.','Billing','https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/lesson-credits.mp4','0:25','beginner',7),
  ('Set up Autopilot','Plan, schedule and publish content automatically.','Automation','https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/lesson-autopilot.mp4','0:30','intermediate',8),
  ('Forge AI Assistant & guided tours','Get instant help and step-by-step guided tours.','Getting Started','https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/lesson-assistant.mp4','0:20','beginner',9),
  ('Dark mode & wrap-up','Theme options and where to go next.','Getting Started','https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/lesson-wrap.mp4','0:20','beginner',10)
) as v(title,description,category,video_url,duration,level,sort_order)
where not exists (select 1 from public.tutorials t where t.title = v.title);
