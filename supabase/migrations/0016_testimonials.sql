-- =====================================================================
-- Editable testimonials (admin-managed, public read).
-- Lets you replace the homepage sample quotes with real, consented ones.
-- Idempotent: safe to re-run.
-- =====================================================================

create table if not exists public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  role         text,
  quote        text not null,
  rating       integer not null default 5,
  platform     text,
  accent       text not null default 'sky',   -- pink|sky|violet|emerald|amber|rose
  avatar_url   text,                            -- optional real photo (with consent)
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_testimonials_pub on public.testimonials(is_published, sort_order);

alter table public.testimonials enable row level security;

-- Public can read only published testimonials; writes go through the admin
-- service-role client (no permissive write policy).
drop policy if exists "testimonials_public_read" on public.testimonials;
create policy "testimonials_public_read" on public.testimonials
  for select using (is_published = true);
