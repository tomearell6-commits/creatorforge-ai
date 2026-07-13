-- 0041_local_business.sql — Local Business Studio (Google Business Profile)
-- Full schema for the module. Additive; owner-RLS (+ workspace_id columns for
-- future agency sharing). Idempotent. Google tokens are stored ENCRYPTED by the
-- app layer (lib/security/secrets) — never plaintext.

-- 1) Connected Google account (one per Google login).
create table if not exists public.local_business_accounts (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  workspace_id         uuid,
  google_email         text,
  provider_account_id  text,
  access_token         text,          -- encrypted
  refresh_token        text,          -- encrypted
  scope                text,
  status               text not null default 'connected'
                         check (status in ('connected','expired','revoked','permission_required','failed')),
  expires_at           timestamptz,
  last_synced_at       timestamptz,
  last_success_at      timestamptz,
  last_error_at        timestamptz,
  last_error           text,
  connected_at         timestamptz not null default now(),
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

-- 2) Business locations under an account.
create table if not exists public.local_business_locations (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  workspace_id           uuid,
  account_id             uuid references public.local_business_accounts(id) on delete cascade,
  provider_location_id   text,
  business_name          text not null,
  address                text,
  phone                  text,
  website                text,
  primary_category       text,
  additional_categories_json jsonb not null default '[]'::jsonb,
  description            text,
  services_json          jsonb not null default '[]'::jsonb,
  products_json          jsonb not null default '[]'::jsonb,
  hours_json             jsonb not null default '{}'::jsonb,
  special_hours_json     jsonb not null default '{}'::jsonb,
  attributes_json        jsonb not null default '{}'::jsonb,
  appointment_url        text,
  social_links_json      jsonb not null default '{}'::jsonb,
  profile_status         text not null default 'needs_attention',
  audit_score            integer,
  last_post_at           timestamptz,
  connection_status      text not null default 'connected',
  last_synced_at         timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists lbl_account_idx on public.local_business_locations (account_id);

-- 3) Audits + their checks/issues.
create table if not exists public.local_business_audits (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  location_id        uuid references public.local_business_locations(id) on delete cascade,
  audit_type         text not null default 'full' check (audit_type in ('quick','full')),
  overall_score      integer,
  completeness_score integer,
  content_score      integer,
  brand_score        integer,
  seo_score          integer,
  engagement_score   integer,
  status             text not null default 'ready' check (status in ('running','ready','failed')),
  summary            text,
  report_json        jsonb not null default '{}'::jsonb,
  credits_used       integer not null default 0,
  created_at         timestamptz not null default now()
);
create index if not exists lba_location_idx on public.local_business_audits (location_id, created_at desc);

create table if not exists public.local_business_audit_checks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  audit_id    uuid references public.local_business_audits(id) on delete cascade,
  category    text not null,
  check_key   text not null,
  label       text not null,
  passed      boolean not null default false,
  severity    text not null default 'info' check (severity in ('info','warning','critical')),
  detail      text
);
create index if not exists lbac_audit_idx on public.local_business_audit_checks (audit_id);

create table if not exists public.local_business_audit_issues (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  audit_id       uuid references public.local_business_audits(id) on delete cascade,
  severity       text not null default 'warning' check (severity in ('warning','critical')),
  title          text not null,
  detail         text,
  recommendation text
);
create index if not exists lbai_audit_idx on public.local_business_audit_issues (audit_id);

-- 4) Optimizer recommendations.
create table if not exists public.local_business_recommendations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  location_id       uuid references public.local_business_locations(id) on delete cascade,
  section           text not null,
  current_value     text,
  recommended_value text,
  reason            text,
  priority          text not null default 'medium' check (priority in ('low','medium','high')),
  impact            text,
  status            text not null default 'suggested' check (status in ('suggested','applied','dismissed')),
  created_at        timestamptz not null default now()
);
create index if not exists lbr_location_idx on public.local_business_recommendations (location_id, created_at desc);

-- 5) Posts + assets + schedules + publish jobs/events.
create table if not exists public.local_business_posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid,
  location_id   uuid references public.local_business_locations(id) on delete cascade,
  post_type     text not null,
  topic         text,
  main_text     text,
  short_text    text,
  cta           text,
  offer_json    jsonb not null default '{}'::jsonb,
  event_json    jsonb not null default '{}'::jsonb,
  image_prompt  text,
  image_url     text,
  status        text not null default 'draft'
                  check (status in ('draft','awaiting_review','approved','scheduled','publishing','published','failed','cancelled')),
  publish_at    timestamptz,
  timezone      text,
  credits_used  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists lbp_location_idx on public.local_business_posts (location_id, created_at desc);

create table if not exists public.local_business_post_assets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  post_id    uuid references public.local_business_posts(id) on delete cascade,
  kind       text not null,
  url        text,
  prompt     text,
  created_at timestamptz not null default now()
);

create table if not exists public.local_business_schedules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  post_id       uuid references public.local_business_posts(id) on delete cascade,
  location_id   uuid,
  scheduled_for timestamptz,
  timezone      text,
  status        text not null default 'scheduled',
  created_at    timestamptz not null default now()
);

create table if not exists public.local_business_publish_jobs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  post_id        uuid references public.local_business_posts(id) on delete cascade,
  location_id    uuid,
  status         text not null default 'pending'
                   check (status in ('pending','publishing','published','failed','cancelled','unavailable')),
  external_ref   text,
  error          text,
  credits_charged integer not null default 0,
  published_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists lbpj_post_idx on public.local_business_publish_jobs (post_id);

create table if not exists public.local_business_publish_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  post_id     uuid,
  location_id uuid,
  event_type  text not null,
  status      text,
  message     text,
  created_at  timestamptz not null default now()
);

-- 6) Products + services.
create table if not exists public.local_business_products (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  location_id  uuid references public.local_business_locations(id) on delete cascade,
  name         text not null,
  category     text,
  description  text,
  price        text,
  currency     text default 'USD',
  image_url    text,
  website_url  text,
  availability text,
  status       text not null default 'active',
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists lbprod_location_idx on public.local_business_products (location_id);

create table if not exists public.local_business_services (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  location_id  uuid references public.local_business_locations(id) on delete cascade,
  name         text not null,
  category     text,
  description  text,
  price        text,
  currency     text default 'USD',
  image_url    text,
  availability text,
  status       text not null default 'active',
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists lbsvc_location_idx on public.local_business_services (location_id);

-- 7) Reviews + drafted responses.
create table if not exists public.local_business_reviews (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  location_id        uuid references public.local_business_locations(id) on delete cascade,
  provider_review_id text,
  reviewer_name      text,
  rating             integer,
  comment            text,
  review_time        timestamptz,
  answered           boolean not null default false,
  created_at         timestamptz not null default now()
);
create index if not exists lbrev_location_idx on public.local_business_reviews (location_id, review_time desc);

create table if not exists public.local_business_review_drafts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  review_id   uuid references public.local_business_reviews(id) on delete cascade,
  location_id uuid,
  tone        text,
  draft_text  text,
  status      text not null default 'draft' check (status in ('draft','approved','published','flagged')),
  needs_human boolean not null default false,
  approved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- 8) Insights + reports + automation + connection logs.
create table if not exists public.local_business_insights (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  location_id    uuid references public.local_business_locations(id) on delete cascade,
  metric         text not null,
  period_start   date,
  period_end     date,
  value          numeric,
  previous_value numeric,
  source         text,
  available      boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists lbins_location_idx on public.local_business_insights (location_id);

create table if not exists public.local_business_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  location_id uuid references public.local_business_locations(id) on delete cascade,
  report_type text not null,
  data_json   jsonb not null default '{}'::jsonb,
  credits_used integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.local_business_automation_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid,
  location_id  uuid,
  name         text not null,
  mode         text not null default 'assisted' check (mode in ('manual','assisted','autopilot')),
  rule_type    text,
  config_json  jsonb not null default '{}'::jsonb,
  enabled      boolean not null default false,
  last_run_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.local_business_connection_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  account_id uuid,
  action     text not null,
  detail     text,
  created_at timestamptz not null default now()
);
create index if not exists lbcl_user_idx on public.local_business_connection_logs (user_id, created_at desc);

-- Owner-RLS on every table.
do $$
declare t text;
begin
  foreach t in array array[
    'local_business_accounts','local_business_locations','local_business_audits',
    'local_business_audit_checks','local_business_audit_issues','local_business_recommendations',
    'local_business_posts','local_business_post_assets','local_business_schedules',
    'local_business_publish_jobs','local_business_publish_events','local_business_products',
    'local_business_services','local_business_reviews','local_business_review_drafts',
    'local_business_insights','local_business_reports','local_business_automation_rules',
    'local_business_connection_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format('create policy %I_own on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
  end loop;
end $$;
