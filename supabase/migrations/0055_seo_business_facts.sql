-- =====================================================================
-- SEO Audit "business details": the real facts a site owner types once (email, address,
-- payment methods, refund window ...) so pages written for them are finished instead of
-- full of "[Fill in]" markers. One row per user + website host, reused by every audit.
-- Idempotent: safe to run more than once.
-- =====================================================================

create table if not exists public.seo_business_facts (
  user_id     uuid not null references auth.users(id) on delete cascade,
  host        text not null,
  facts       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, host)
);

alter table public.seo_business_facts enable row level security;
drop policy if exists seo_business_facts_owner on public.seo_business_facts;
create policy seo_business_facts_owner on public.seo_business_facts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
