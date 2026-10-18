-- =====================================================================
-- SEO Autopilot: optional "review each article before it publishes".
--   mode = 'auto'   -> articles go live on their own (default)
--   mode = 'review' -> each article is written and saved for the owner to
--                      read, then approved (published) or rejected.
-- Idempotent: safe to run more than once.
-- =====================================================================

alter table public.seo_autopost_sites add column if not exists mode text not null default 'auto';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'seo_autopost_sites_mode_check') then
    alter table public.seo_autopost_sites add constraint seo_autopost_sites_mode_check check (mode in ('auto', 'review'));
  end if;
end $$;

-- Fast lookup of the articles waiting for review.
create index if not exists idx_seo_articles_autopost_status on public.seo_articles(autopost_site_id, status);
