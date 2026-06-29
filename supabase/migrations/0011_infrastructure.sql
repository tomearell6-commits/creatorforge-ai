-- =====================================================================
-- AI Infrastructure Operations Center (admin-only).
--
-- Snapshot tables: usage/cost/health/balance/renewal rows are written by admins
-- or a cron job; the app merges the newest per provider_id. The live "is this
-- configured?" truth comes from env (code registry), not these tables.
--
-- Security: all tables are admin/service-role only. RLS is ENABLED with NO
-- permissive policy, so the anon/auth keys can't read them; the admin routes use
-- the service-role client (which bypasses RLS) behind requireAdmin().
--
-- Idempotent: safe to re-run.
-- =====================================================================

create table if not exists public.service_providers (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  category    text not null,         -- ai | payment | storage | email | auth | publishing | infra
  status      text not null default 'unknown',
  api_endpoint text,
  auth_type   text,
  renewal_required boolean not null default false,
  supports_usage    boolean not null default false,
  supports_balance  boolean not null default false,
  supports_health   boolean not null default false,
  supports_webhooks boolean not null default false,
  docs_url    text,
  support_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.provider_accounts (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  account_label text,
  plan        text,
  env_configured boolean not null default false,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.provider_usage (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  calls_today integer not null default 0,
  calls_month integer not null default 0,
  quota_limit integer,
  quota_used  integer,
  created_at  timestamptz not null default now()
);
create index if not exists idx_provider_usage on public.provider_usage(provider_id, created_at desc);

create table if not exists public.provider_costs (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  daily_usd   numeric(12,2),
  monthly_usd numeric(12,2),
  period      text,                  -- e.g. '2026-06'
  created_at  timestamptz not null default now()
);
create index if not exists idx_provider_costs on public.provider_costs(provider_id, created_at desc);

create table if not exists public.provider_health (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  status      text not null default 'healthy', -- healthy | warning | critical | offline
  latency_ms  integer,
  error_rate  numeric(5,2),
  webhook_ok  boolean,
  last_success timestamptz,
  last_failure timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_provider_health on public.provider_health(provider_id, created_at desc);

create table if not exists public.provider_renewals (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  plan        text,
  renewal_date timestamptz,
  monthly_cost numeric(12,2),
  status      text not null default 'active',
  created_at  timestamptz not null default now()
);
create index if not exists idx_provider_renewals on public.provider_renewals(provider_id, created_at desc);

create table if not exists public.provider_alerts (
  id          uuid primary key default gen_random_uuid(),
  provider_id text,
  severity    text not null default 'warning', -- info | warning | critical
  title       text not null,
  description text,
  recommended_action text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_provider_alerts on public.provider_alerts(resolved, created_at desc);

create table if not exists public.provider_balances (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  amount      numeric(18,4),
  currency    text,
  low         boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_provider_balances on public.provider_balances(provider_id, created_at desc);

-- NEVER store full keys here — only a masked hint + metadata.
create table if not exists public.provider_api_keys (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  key_name    text not null,
  environment text not null default 'production', -- production | sandbox | test
  masked_hint text,                  -- e.g. 'sk-...a1b2' (masked, never the full key)
  status      text not null default 'active',     -- active | disabled | rotating | expired
  last_used   timestamptz,
  expires_at  timestamptz,
  rotation_date timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_provider_api_keys on public.provider_api_keys(provider_id);

create table if not exists public.provider_webhook_logs (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  event       text,
  ok          boolean not null default true,
  http_status integer,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_provider_webhook_logs on public.provider_webhook_logs(provider_id, created_at desc);

create table if not exists public.provider_status_history (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  status      text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_provider_status_history on public.provider_status_history(provider_id, created_at desc);

create table if not exists public.provider_notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  severity    text not null default 'info',
  title       text not null,
  body        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_provider_notifications on public.provider_notifications(is_read, created_at desc);

-- Single-row threshold configuration.
create table if not exists public.provider_thresholds (
  id          integer primary key default 1,
  warning_threshold integer not null default 80,
  critical_threshold integer not null default 95,
  renewal_reminder_days integer not null default 14,
  storage_alert_pct integer not null default 90,
  api_quota_alert_pct integer not null default 80,
  credit_alert_pct integer not null default 20,
  daily_spend_alert numeric(12,2) not null default 50,
  monthly_spend_alert numeric(12,2) not null default 1000,
  updated_at  timestamptz not null default now(),
  constraint provider_thresholds_singleton check (id = 1)
);

create table if not exists public.provider_cost_forecasts (
  id          uuid primary key default gen_random_uuid(),
  provider_id text,
  forecast_month text,               -- '2026-07'
  forecast_usd numeric(12,2),
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- RLS — admin/service-role only (enable, no permissive policy).
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'service_providers','provider_accounts','provider_usage','provider_costs',
    'provider_health','provider_renewals','provider_alerts','provider_balances',
    'provider_api_keys','provider_webhook_logs','provider_status_history',
    'provider_notifications','provider_thresholds','provider_cost_forecasts'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Seed the single thresholds row.
insert into public.provider_thresholds (id) values (1) on conflict (id) do nothing;
