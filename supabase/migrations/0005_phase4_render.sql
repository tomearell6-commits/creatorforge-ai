-- =====================================================================
-- Phase 4 migration: real video rendering (Shotstack).
-- Adds the external render id to render_jobs. Run on existing databases.
-- =====================================================================

alter table public.render_jobs add column if not exists provider_job_id text;
