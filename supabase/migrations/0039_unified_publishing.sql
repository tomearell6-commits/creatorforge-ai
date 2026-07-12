-- 0039_unified_publishing.sql — Unified Publishing & Promotion layer
-- Additive only. Reuses existing social_accounts / publish_jobs / scheduled_posts
-- / publish_history / workspaces. Adds per-destination tracking, promotion,
-- approvals, connection logs, and a unified events feed. Owner-RLS. Idempotent.

-- 1) Extend the existing connected-accounts store (social_accounts) so it can
--    also hold advertising / website / email connections, not just social.
alter table public.social_accounts
  add column if not exists category text not null default 'social'
    check (category in ('social','advertising','website','email'));
alter table public.social_accounts
  add column if not exists last_error text;
create index if not exists social_accounts_category_idx
  on public.social_accounts (user_id, category);

-- 2) Per-destination tracking for a publish job. Each destination succeeds or
--    fails INDEPENDENTLY — one failure never fails the whole job.
create table if not exists public.publish_job_destinations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  job_id         uuid,                 -- soft ref to publish_jobs.id (no hard FK: schema-safe)
  workspace_id   uuid,
  content_type   text not null,
  destination    text not null,        -- PublishDestinationId
  account_id     uuid,                 -- social_accounts.id used for this destination
  status         text not null default 'pending'
                   check (status in ('pending','publishing','published','scheduled','failed','cancelled','export_ready')),
  external_url   text,
  external_ref   text,
  scheduled_for  timestamptz,
  published_at   timestamptz,
  credits_charged integer not null default 0,
  attempts       integer not null default 0,
  error          text,
  export_package jsonb,                -- for non-live providers: the ready-to-use package
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists pjd_user_idx on public.publish_job_destinations (user_id, created_at desc);
create index if not exists pjd_job_idx on public.publish_job_destinations (job_id);

-- 3) Optimized, per-destination metadata (title/desc/caption/hashtags differ per platform).
create table if not exists public.publish_metadata (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  job_id         uuid,
  destination    text not null,
  title          text,
  description    text,
  caption        text,
  hashtags       jsonb not null default '[]'::jsonb,
  thumbnail_url  text,
  fields         jsonb not null default '{}'::jsonb,   -- any other metadataFields
  created_at     timestamptz not null default now()
);
create index if not exists publish_metadata_job_idx on public.publish_metadata (job_id);

-- 4) Promotion campaigns (the "Promote this content" object) + assets + jobs.
create table if not exists public.promotion_campaigns (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  workspace_id   uuid,
  content_type   text not null,
  source_kind    text,                 -- 'video' | 'book' | 'article' | 'design' | 'website' | ...
  source_id      uuid,                 -- id of the completed project
  title          text not null,
  objective      text,                 -- awareness | traffic | conversions | ...
  status         text not null default 'draft'
                   check (status in ('draft','ready','exported','scheduled','running','paused','completed','failed')),
  budget         numeric,
  currency       text default 'USD',
  country        text,
  audience       jsonb not null default '{}'::jsonb,
  landing_url    text,
  cta            text,
  start_at       timestamptz,
  end_at         timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists promo_campaigns_user_idx on public.promotion_campaigns (user_id, created_at desc);

create table if not exists public.promotion_assets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  campaign_id    uuid references public.promotion_campaigns(id) on delete cascade,
  kind           text not null,        -- headline | primary_text | description | cta | hook | hashtags | image_prompt | video_script | landing_copy | email_sequence | social_post
  platform       text,                 -- optional target platform / ad platform
  content        text,
  data           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists promo_assets_campaign_idx on public.promotion_assets (campaign_id);

create table if not exists public.promotion_jobs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  campaign_id    uuid references public.promotion_campaigns(id) on delete cascade,
  ad_platform    text not null,        -- AdPlatformId
  ad_account_id  uuid,                 -- social_accounts.id (category='advertising')
  status         text not null default 'draft'
                   check (status in ('draft','prepared','export_ready','published','failed')),
  external_ref   text,
  export_package jsonb,
  credits_charged integer not null default 0,
  error          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists promo_jobs_campaign_idx on public.promotion_jobs (campaign_id);

-- 5) Account connection audit log.
create table if not exists public.account_connection_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  account_id     uuid,
  platform       text,
  category       text,
  action         text not null check (action in ('connect','disconnect','refresh','expire','error','reauth_required')),
  detail         text,
  created_at     timestamptz not null default now()
);
create index if not exists acl_user_idx on public.account_connection_logs (user_id, created_at desc);

-- 6) Approvals for publish/promote actions (Manual / Assisted / Autopilot).
create table if not exists public.publishing_approvals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  kind           text not null check (kind in ('publish','promote')),
  ref_id         uuid,                 -- job or campaign id
  mode           text not null default 'assisted' check (mode in ('manual','assisted','autopilot')),
  status         text not null default 'pending' check (status in ('pending','approved','rejected','auto_approved')),
  summary        text,
  decided_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists pub_approvals_user_idx on public.publishing_approvals (user_id, status, created_at desc);

-- 7) Unified publishing events feed (drives the activity view + calendar status).
create table if not exists public.publishing_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  event_type     text not null,        -- publish.success | publish.failed | schedule.created | promote.ready | account.connected | account.expired | ...
  content_type   text,
  ref_id         uuid,
  platform       text,
  status         text,
  message        text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists pub_events_user_idx on public.publishing_events (user_id, created_at desc);

-- RLS: owner-only on every new table.
do $$
declare t text;
begin
  foreach t in array array[
    'publish_job_destinations','publish_metadata','promotion_campaigns','promotion_assets',
    'promotion_jobs','account_connection_logs','publishing_approvals','publishing_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format(
      'create policy %I_own on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t
    );
  end loop;
end $$;
