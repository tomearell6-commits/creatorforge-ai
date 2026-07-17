-- 0044_build_site_domains.sql — custom domains for published sites (paid tiers).
--
-- A site can be reached at its CreatorsForge URL (/s/{slug}) AND, on Business/
-- Enterprise plans, at the customer's own domain. The domain is attached to our
-- Vercel project via the Vercel Domains API, which provisions + renews SSL; we
-- store the state here and resolve incoming hostnames against custom_domain.

alter table public.build_sites
  add column if not exists custom_domain text,
  -- none | pending (added to Vercel, DNS not yet correct) | verified | error
  add column if not exists domain_status text not null default 'none',
  add column if not exists domain_verified_at timestamptz,
  add column if not exists domain_error text;

-- One site per domain, globally. Partial so many rows can hold NULL.
create unique index if not exists build_sites_custom_domain_key
  on public.build_sites(custom_domain)
  where custom_domain is not null;

-- Hostname -> site lookup on every request to a custom domain.
create index if not exists build_sites_domain_status_idx
  on public.build_sites(domain_status);
