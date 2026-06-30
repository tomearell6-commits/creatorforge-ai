-- =====================================================================
-- CreatorForge Publishing Studio — AI book writing platform.
--
-- Write, organize, edit, export and market original books. Owner-only RLS on all
-- user tables; templates are public-read. Idempotent: safe to re-run.
-- =====================================================================

create table if not exists public.books (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  subtitle     text, author_name text, language text default 'en',
  category     text, audience text, writing_style text, tone text, reading_level text,
  target_words integer,
  concept      text, description text, objectives jsonb not null default '[]'::jsonb, usps jsonb not null default '[]'::jsonb,
  status       text not null default 'draft',   -- draft | writing | published | archived
  favorite     boolean not null default false,
  cover_url    text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_books_user on public.books(user_id, updated_at desc);
create index if not exists idx_books_status on public.books(status);

create table if not exists public.book_chapters (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references public.books(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  position     integer not null default 0,
  part         text,
  title        text not null,
  content      text not null default '',
  notes        text,
  status       text not null default 'draft',   -- draft | written | reviewed | final
  word_count   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_book_chapters_book on public.book_chapters(book_id, position);

create table if not exists public.book_versions (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  uuid not null references public.book_chapters(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null default '',
  label       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_book_versions_chapter on public.book_versions(chapter_id, created_at desc);

create table if not exists public.book_outlines (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  outline_json jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_book_outlines_book on public.book_outlines(book_id);

create table if not exists public.book_templates (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  category    text not null,
  description text,
  structure_json jsonb not null default '{}'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.book_exports (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  format      text not null,                    -- pdf | docx | epub | md | txt | html
  url         text,
  status      text not null default 'ready',
  created_at  timestamptz not null default now()
);
create index if not exists idx_book_exports_book on public.book_exports(book_id, created_at desc);

create table if not exists public.book_covers (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  prompt      text, style text, image_url text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_book_covers_book on public.book_covers(book_id);

create table if not exists public.book_illustrations (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  chapter_id  uuid references public.book_chapters(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  prompt      text, style text, image_url text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_book_illustrations_book on public.book_illustrations(book_id);

create table if not exists public.book_marketing_assets (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  asset_type  text not null,                    -- description | amazon | landing | email | social | video_script | checklist
  content     text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_book_marketing_book on public.book_marketing_assets(book_id);

create table if not exists public.book_campaigns (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  ad_campaign_id uuid,                           -- links to ad_campaigns
  created_at  timestamptz not null default now()
);

create table if not exists public.book_statistics (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null unique references public.books(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  total_words integer not null default 0,
  chapters    integer not null default 0,
  exports     integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- =====================================================================
-- RLS — owner-only on user tables; templates public-read.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'books','book_chapters','book_versions','book_outlines','book_exports','book_covers',
    'book_illustrations','book_marketing_assets','book_campaigns','book_statistics'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format('create policy "%s_owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t, t);
  end loop;
end $$;

alter table public.book_templates enable row level security;
drop policy if exists "book_templates_read" on public.book_templates;
create policy "book_templates_read" on public.book_templates for select using (true);

-- Seed starter book templates (idempotent on slug).
insert into public.book_templates (slug, name, category, description, sort_order) values
  ('business','Business Book','Business','Frameworks, case studies, and actionable takeaways.',1),
  ('children','Children''s Book','Children''s Books','Short, illustrated, age-appropriate storytelling.',2),
  ('fantasy','Fantasy Novel','Fantasy','World-building, arcs, and chapter beats.',3),
  ('romance','Romance Novel','Romance','Character-driven arcs with emotional beats.',4),
  ('self_help','Self Help','Self Help','Problem → method → steps → results.',5),
  ('cookbook','Cookbook','Cookbooks','Intro, technique, and structured recipes.',6),
  ('biography','Biography','Biography','Chronological life story with themes.',7),
  ('memoir','Memoir','Memoir','First-person narrative around a central theme.',8),
  ('workbook','Educational Workbook','Educational','Lessons + exercises + answer keys.',9),
  ('prompt_book','Prompt Book','Prompt Books','Curated prompts grouped by use case.',10),
  ('lead_magnet','Lead Magnet','Lead Magnets','Short, high-value guide with a CTA.',11),
  ('course_companion','Course Companion','Educational','Companion workbook to a course.',12),
  ('startup_guide','Startup Guide','Entrepreneurship','Step-by-step startup playbook.',13),
  ('marketing_playbook','Marketing Playbook','Marketing','Tactics, templates, and checklists.',14),
  ('investment_guide','Investment Guide','Investing','Concepts, strategies, risk management.',15),
  ('travel_guide','Travel Guide','Travel','Destinations, itineraries, tips.',16),
  ('training_manual','Training Manual','Product Guides','Procedures, SOPs, and reference.',17),
  ('journal','Journal','Journals','Guided prompts and reflection pages.',18),
  ('custom','Custom Book','Custom Category','Start from a blank, flexible structure.',19)
on conflict (slug) do nothing;
