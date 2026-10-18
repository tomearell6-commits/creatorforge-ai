-- =====================================================================
-- SEO Autopilot: one "project" per website. The user enters a website
-- address; we study the brand, competitors and keywords, build a 30-day
-- content plan, and (once WordPress is connected) publish it daily.
-- Reuses the existing seo_projects table (owner RLS already in place).
-- Idempotent: safe to run more than once.
-- =====================================================================

alter table public.seo_projects add column if not exists website_url  text;
alter table public.seo_projects add column if not exists status       text not null default 'new';   -- new | analyzing | ready | failed
alter table public.seo_projects add column if not exists progress     text;                           -- what the analysis is doing right now
alter table public.seo_projects add column if not exists error        text;
alter table public.seo_projects add column if not exists brand        jsonb not null default '{}'::jsonb;   -- name, summary, offerings, audience, tone, country, language
alter table public.seo_projects add column if not exists competitors  jsonb not null default '[]'::jsonb;   -- [{domain, rank, topPage, whyTheyRank}]
alter table public.seo_projects add column if not exists keywords     jsonb not null default '[]'::jsonb;   -- [{keyword, intent, why}]
alter table public.seo_projects add column if not exists gaps         jsonb not null default '[]'::jsonb;   -- topics competitors cover that the site does not
alter table public.seo_projects add column if not exists plan         jsonb not null default '[]'::jsonb;   -- 30-day plan [{day, title, keyword, secondaryKeywords, intent, angle}]
alter table public.seo_projects add column if not exists language     text not null default 'en';
alter table public.seo_projects add column if not exists analyzed_at  timestamptz;
alter table public.seo_projects add column if not exists updated_at   timestamptz not null default now();

-- One project per website per user.
create unique index if not exists uq_seo_projects_user_site on public.seo_projects(user_id, website_url) where website_url is not null;

-- Link an auto-poster to the project (and its plan) it was started from.
alter table public.seo_autopost_sites add column if not exists project_id uuid references public.seo_projects(id) on delete set null;
