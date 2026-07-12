-- 0040_workflow_state.sql — Unified User Workflow Standard state model
-- One row per project tracks its position in the six-stage journey
-- (Create → Review → Connect → Publish → Promote → Analyze). Additive; existing
-- project tables are untouched. Owner-RLS. Idempotent.

create table if not exists public.project_workflow_state (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  project_type       text not null,                         -- ContentTypeId
  project_id         uuid not null,                         -- soft ref to the studio's project row
  current_step       text not null default 'create'
                       check (current_step in ('create','review','connect','publish','promote','analyze')),
  completed_steps    text[] not null default '{}',
  workflow_status    text not null default 'draft',
  review_status      text,
  connection_status  text,
  publish_status     text,
  promotion_status   text,
  analytics_status   text,
  last_action        text,
  next_action        text,
  title              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, project_type, project_id)
);
create index if not exists pws_user_idx on public.project_workflow_state (user_id, updated_at desc);

alter table public.project_workflow_state enable row level security;
drop policy if exists project_workflow_state_own on public.project_workflow_state;
create policy project_workflow_state_own on public.project_workflow_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
