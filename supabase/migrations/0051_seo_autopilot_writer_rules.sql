-- =====================================================================
-- SEO Autopilot: "rules for the writer" per auto-posted website.
-- Plain-language facts about how the business really operates (minimum order,
-- payment methods, no samples, ...). The article writer must follow them, so
-- an article never promises something the business does not offer.
-- Idempotent: safe to run more than once.
-- =====================================================================

alter table public.seo_autopost_sites add column if not exists writer_rules text not null default '';
