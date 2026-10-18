-- =====================================================================
-- SEO Autopilot: publish to the CreatorsForge blog itself (not WordPress).
--   destination = 'wordpress'         -> a connected WordPress site (default)
--   destination = 'creatorforge_blog' -> posts go straight into public.blog_posts
-- The blog destination has no WordPress site, so wordpress_site_id becomes optional.
-- Idempotent: safe to run more than once.
-- =====================================================================

alter table public.seo_autopost_sites add column if not exists destination text not null default 'wordpress';

alter table public.seo_autopost_sites drop constraint if exists seo_autopost_sites_destination_check;
alter table public.seo_autopost_sites
  add constraint seo_autopost_sites_destination_check check (destination in ('wordpress', 'creatorforge_blog'));

alter table public.seo_autopost_sites alter column wordpress_site_id drop not null;

-- A WordPress destination still needs its site; the blog destination must not have one.
alter table public.seo_autopost_sites drop constraint if exists seo_autopost_sites_destination_site_check;
alter table public.seo_autopost_sites
  add constraint seo_autopost_sites_destination_site_check
  check ((destination = 'wordpress' and wordpress_site_id is not null) or (destination = 'creatorforge_blog' and wordpress_site_id is null));

-- Only one blog autoposter per owner.
create unique index if not exists uq_seo_autopost_blog_per_user
  on public.seo_autopost_sites (user_id) where destination = 'creatorforge_blog';
