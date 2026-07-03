-- =====================================================================
-- Admin Operations Review Center.
--
-- Durable operational records for every external dependency: provider
-- accounts, API-key rotation schedules, subscriptions/renewals, credit
-- balances, usage quotas, webhook health, unified alerts, monthly review
-- checklists, cost forecasts, notes and health logs.
--
-- Complements (does not replace) the live env-driven Infrastructure layer
-- (migration 0011 provider_* tables): that layer answers "is it configured
-- right now"; this layer answers "when does it renew / rotate / run out".
--
-- ADMIN-ONLY: RLS enabled with NO permissive policies — rows are readable/
-- writable exclusively through the service-role client behind requireAdmin().
-- Never store raw API keys or passwords here; only masked hints + metadata.
-- Idempotent.
-- =====================================================================

-- ---- Provider records (one row per external service account) -------------
create table if not exists public.operations_providers (
  id             uuid primary key default gen_random_uuid(),
  provider_id    text not null unique,             -- registry slug (e.g. 'anthropic')
  name           text not null,
  category       text not null default 'other',    -- ai|seo|leads|payments|storage|database|email|publishing|infrastructure|other
  account_email  text,
  current_plan   text,
  monthly_cost   numeric not null default 0,       -- USD
  billing_cycle  text not null default 'monthly',  -- monthly|yearly|usage|free
  renewal_date   date,
  payment_method text,
  health_status  text not null default 'unknown',  -- healthy|attention|critical|not_configured|unknown
  webhook_status text,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  admin_notes    text,
  login_url      text,
  support_url    text,
  docs_url       text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_ops_providers_category on public.operations_providers(category);
create index if not exists idx_ops_providers_renewal on public.operations_providers(renewal_date);

-- ---- API keys (masked metadata ONLY — never full keys) --------------------
create table if not exists public.operations_provider_keys (
  id               uuid primary key default gen_random_uuid(),
  provider_id      text not null,                  -- registry slug
  key_name         text not null default 'API key',
  environment      text not null default 'production', -- production|preview|development
  masked_value     text,                           -- e.g. sk-****abcd
  created_date     date,
  last_used_at     timestamptz,
  last_rotated_at  date,
  rotation_days    integer not null default 90,    -- rotate every N days
  status           text not null default 'unknown',-- healthy|rotate_soon|overdue|disabled|missing|unknown
  risk_level       text not null default 'medium', -- low|medium|high
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_ops_keys_provider on public.operations_provider_keys(provider_id);

-- ---- Subscriptions / renewals ---------------------------------------------
create table if not exists public.operations_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  provider_id    text not null,
  plan_name      text not null default 'Standard',
  renewal_date   date,
  billing_cycle  text not null default 'monthly',
  monthly_cost   numeric not null default 0,
  payment_method text,
  status         text not null default 'active',   -- active|renew_soon|renewal_due|expired|payment_failed|manual_review
  auto_renews    boolean not null default true,
  notes          text,
  last_renewed_at date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_ops_subs_renewal on public.operations_subscriptions(renewal_date);

-- ---- Credit balances (credit-metered providers) ----------------------------
create table if not exists public.operations_credit_balances (
  id                 uuid primary key default gen_random_uuid(),
  provider_id        text not null unique,
  unit               text not null default 'credits', -- credits|USD|emails|characters|minutes
  current_balance    numeric,
  monthly_usage      numeric not null default 0,
  daily_avg_usage    numeric not null default 0,
  warning_pct        integer not null default 30,
  critical_pct       integer not null default 10,
  full_balance       numeric,                       -- what "100%" means (last top-up size)
  last_topup_at      date,
  last_topup_amount  numeric,
  topup_url          text,
  notes              text,
  updated_at         timestamptz not null default now()
);

-- ---- Usage quotas -----------------------------------------------------------
create table if not exists public.operations_usage_quotas (
  id             uuid primary key default gen_random_uuid(),
  provider_id    text not null,
  quota_type     text not null default 'requests', -- requests|tokens|characters|voice_minutes|render_minutes|storage_gb|emails|pages_crawled|emails_verified
  monthly_limit  numeric,
  current_usage  numeric not null default 0,
  reset_date     date,
  notes          text,
  updated_at     timestamptz not null default now(),
  unique (provider_id, quota_type)
);

-- ---- Webhook health ---------------------------------------------------------
create table if not exists public.operations_webhook_health (
  id                uuid primary key default gen_random_uuid(),
  provider_id       text not null unique,
  webhook_path      text,                           -- our endpoint (path only, no secrets)
  last_success_at   timestamptz,
  last_failure_at   timestamptz,
  failure_count     integer not null default 0,
  status            text not null default 'unknown',-- healthy|failing|unknown
  retry_available   boolean not null default false,
  notes             text,
  updated_at        timestamptz not null default now()
);

-- ---- Unified alerts ----------------------------------------------------------
create table if not exists public.operations_alerts (
  id                 uuid primary key default gen_random_uuid(),
  alert_type         text not null,                 -- renewal|key_rotation|low_credits|quota|payment_failure|webhook_failure|database|storage|provider_offline|high_cost
  severity           text not null default 'warning', -- info|warning|critical
  provider_id        text,
  message            text not null,
  recommended_action text,
  dedupe_key         text unique,                   -- prevents duplicate open alerts per condition
  resolved           boolean not null default false,
  resolved_at        timestamptz,
  resolved_by        text,
  admin_notes        text,
  emailed_at         timestamptz,                   -- when the admin email was sent
  created_at         timestamptz not null default now()
);
create index if not exists idx_ops_alerts_open on public.operations_alerts(resolved, severity, created_at desc);

-- ---- Monthly review checklist -------------------------------------------------
create table if not exists public.operations_review_checklists (
  id           uuid primary key default gen_random_uuid(),
  month        text not null unique,                -- YYYY-MM
  status       text not null default 'open',        -- open|completed
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.operations_review_items (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references public.operations_review_checklists(id) on delete cascade,
  item_key      text not null,
  label         text not null,
  completed     boolean not null default false,
  completed_by  text,
  completed_at  timestamptz,
  notes         text,
  sort_order    integer not null default 0,
  unique (checklist_id, item_key)
);
create index if not exists idx_ops_review_items_list on public.operations_review_items(checklist_id, sort_order);

-- ---- Cost forecasts -------------------------------------------------------------
create table if not exists public.operations_cost_forecasts (
  id               uuid primary key default gen_random_uuid(),
  month            text not null unique,            -- YYYY-MM
  current_cost     numeric not null default 0,
  forecasted_cost  numeric not null default 0,
  by_provider_json jsonb not null default '{}'::jsonb,
  by_feature_json  jsonb not null default '{}'::jsonb,
  metrics_json     jsonb not null default '{}'::jsonb, -- cost per user/video/article/campaign
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---- Free-form admin notes -------------------------------------------------------
create table if not exists public.operations_admin_notes (
  id          uuid primary key default gen_random_uuid(),
  provider_id text,
  topic       text,
  note        text not null,
  author      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_ops_notes_provider on public.operations_admin_notes(provider_id, created_at desc);

-- ---- Health logs (daily cron snapshots) --------------------------------------------
create table if not exists public.operations_provider_health_logs (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  status      text not null,
  detail      text,
  checked_at  timestamptz not null default now()
);
create index if not exists idx_ops_health_logs on public.operations_provider_health_logs(provider_id, checked_at desc);

-- ---- RLS: enabled, NO permissive policies (service-role/admin only) -----------------
do $$
declare t text;
begin
  foreach t in array array[
    'operations_providers','operations_provider_keys','operations_subscriptions',
    'operations_credit_balances','operations_usage_quotas','operations_webhook_health',
    'operations_alerts','operations_review_checklists','operations_review_items',
    'operations_cost_forecasts','operations_admin_notes','operations_provider_health_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
