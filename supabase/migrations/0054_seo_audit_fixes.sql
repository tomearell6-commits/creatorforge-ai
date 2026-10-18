-- =====================================================================
-- SEO Audit "fix it for me": the fixes a user paid credits for, and what each produced
-- (a draft page created on their WordPress site, or ready-to-paste text). One row per
-- audit + offer, so asking for the same fix twice never charges twice.
-- Idempotent: safe to run more than once.
-- =====================================================================

create table if not exists public.seo_audit_fixes (
  id          uuid primary key default gen_random_uuid(),
  audit_id    uuid not null references public.seo_audits(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  offer_id    text not null,
  status      text not null default 'done' check (status in ('done', 'failed')),
  credits     integer not null default 0,
  result      jsonb not null default '{}'::jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  unique (audit_id, offer_id)
);
create index if not exists idx_seo_audit_fixes_audit on public.seo_audit_fixes(audit_id);

alter table public.seo_audit_fixes enable row level security;
drop policy if exists seo_audit_fixes_owner on public.seo_audit_fixes;
create policy seo_audit_fixes_owner on public.seo_audit_fixes
  for select using (auth.uid() = user_id);
-- Rows are written by the server (service role) after the credits are taken.
