-- =====================================================================
-- SEO Audit Tool (under AI SEO Studio).
--
-- Users enter a URL, the modular scanner engine fetches + analyzes the page
-- (robots.txt, sitemap, metadata, headings, images, links, schema, performance),
-- AI produces recommendations + fix plan + content ideas. Credits charged per
-- audit type. Owner-only RLS.
--
-- Idempotent: safe to re-run.
-- =====================================================================

create table if not exists public.seo_audits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  website_url      text not null,
  audit_type       text not null default 'quick', -- quick | full | wordpress | ecommerce | blog
  status           text not null default 'pending', -- pending | scanning | analyzing | completed | failed
  overall_score    integer,
  technical_score  integer,
  content_score    integer,
  performance_score integer,
  mobile_score     integer,
  indexing_score   integer,
  ranking_score    integer,
  credits_used     integer not null default 0,
  error            text,
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_seo_audits_user on public.seo_audits(user_id, created_at desc);
create index if not exists idx_seo_audits_status on public.seo_audits(status);

create table if not exists public.seo_audit_pages (
  id          uuid primary key default gen_random_uuid(),
  audit_id    uuid not null references public.seo_audits(id) on delete cascade,
  url         text not null,
  status_code integer,
  load_ms     integer,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_seo_audit_pages on public.seo_audit_pages(audit_id);

create table if not exists public.seo_audit_issues (
  id              uuid primary key default gen_random_uuid(),
  audit_id        uuid not null references public.seo_audits(id) on delete cascade,
  issue_type      text not null,            -- technical | onpage | content | performance | mobile | indexing | links | images | schema
  severity        text not null,            -- critical | warning | passed
  title           text not null,
  description     text,
  recommended_fix text,
  affected_url    text,
  status          text not null default 'open', -- open | fixed | ignored
  created_at      timestamptz not null default now()
);
create index if not exists idx_seo_audit_issues on public.seo_audit_issues(audit_id, severity);

create table if not exists public.seo_audit_scores (
  id          uuid primary key default gen_random_uuid(),
  audit_id    uuid not null references public.seo_audits(id) on delete cascade,
  category    text not null,                -- overall | technical | content | performance | mobile | indexing | ranking
  score       integer not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_seo_audit_scores on public.seo_audit_scores(audit_id);

create table if not exists public.seo_audit_recommendations (
  id          uuid primary key default gen_random_uuid(),
  audit_id    uuid not null references public.seo_audits(id) on delete cascade,
  category    text,
  title       text not null,
  detail      text,
  priority    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_seo_audit_recs on public.seo_audit_recommendations(audit_id);

create table if not exists public.seo_audit_reports (
  id          uuid primary key default gen_random_uuid(),
  audit_id    uuid not null unique references public.seo_audits(id) on delete cascade,
  report_json jsonb not null default '{}'::jsonb,  -- full structured report
  summary     text,
  created_at  timestamptz not null default now()
);

create table if not exists public.seo_audit_fix_plans (
  id          uuid primary key default gen_random_uuid(),
  audit_id    uuid not null references public.seo_audits(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan_json   jsonb not null default '{}'::jsonb,
  credits_used integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_seo_audit_fix_plans on public.seo_audit_fix_plans(audit_id);

-- =====================================================================
-- RLS — owner-only via the parent audit (issues/scores/etc. join through audit).
-- =====================================================================
alter table public.seo_audits               enable row level security;
alter table public.seo_audit_pages          enable row level security;
alter table public.seo_audit_issues         enable row level security;
alter table public.seo_audit_scores         enable row level security;
alter table public.seo_audit_recommendations enable row level security;
alter table public.seo_audit_reports        enable row level security;
alter table public.seo_audit_fix_plans      enable row level security;

drop policy if exists "seo_audits_owner" on public.seo_audits;
create policy "seo_audits_owner" on public.seo_audits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "seo_audit_fix_plans_owner" on public.seo_audit_fix_plans;
create policy "seo_audit_fix_plans_owner" on public.seo_audit_fix_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child tables: owner-only through the parent audit.
do $$
declare t text;
begin
  foreach t in array array['seo_audit_pages','seo_audit_issues','seo_audit_scores','seo_audit_recommendations','seo_audit_reports']
  loop
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner" on public.%I for all using (exists (select 1 from public.seo_audits a where a.id = audit_id and a.user_id = auth.uid())) with check (exists (select 1 from public.seo_audits a where a.id = audit_id and a.user_id = auth.uid()));',
      t, t);
  end loop;
end $$;
