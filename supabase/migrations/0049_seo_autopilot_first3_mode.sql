-- =====================================================================
-- SEO Autopilot: third publishing mode.
--   mode = 'first3' -> the owner reviews the first 3 articles, then the
--                      site switches to automatic publishing on its own.
-- Idempotent: safe to run more than once.
-- =====================================================================

alter table public.seo_autopost_sites drop constraint if exists seo_autopost_sites_mode_check;
alter table public.seo_autopost_sites
  add constraint seo_autopost_sites_mode_check check (mode in ('auto', 'review', 'first3'));
