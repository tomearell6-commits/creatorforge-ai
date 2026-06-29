-- =====================================================================
-- AI Video render tiers. Adds render mode + a metadata bag to render_jobs
-- so the queue can track the two-stage flow (fal clips → Shotstack assembly).
-- Idempotent.
-- =====================================================================

alter table public.render_jobs add column if not exists mode text not null default 'slideshow';
alter table public.render_jobs add column if not exists metadata jsonb not null default '{}'::jsonb;
