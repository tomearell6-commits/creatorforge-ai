-- =====================================================================
-- Lead Generator — premium access control & compliance gating.
--
-- Adds per-user feature access, compliance acceptance, sender profiles, plan
-- usage limits, usage logs, manual send approvals, safety-check records, and an
-- admin action audit. Owner-only RLS on user data; usage-limit defaults are
-- readable by any authenticated user (the access guard needs them). Idempotent.
-- =====================================================================

-- Admin-managed per-user feature toggle / suspension / override.
create table if not exists public.lead_feature_access (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  enabled              boolean not null default true,
  access_level_override text,                       -- null = derive from plan; else none|limited|full|advanced
  suspended            boolean not null default false,
  suspended_reason     text,
  updated_by           uuid,
  updated_at           timestamptz not null default now()
);

create table if not exists public.lead_compliance_acceptance (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  version     text not null,
  accepted_at timestamptz not null default now(),
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_lead_compliance_accept_user on public.lead_compliance_acceptance(user_id, accepted_at desc);

create table if not exists public.lead_sender_profiles (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  sender_name         text,
  business_name       text,
  business_website    text,
  business_email      text,
  business_address    text,
  reply_to_email      text,
  unsubscribe_footer  text,
  compliance_confirmed boolean not null default false,
  completed           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Per-plan limits (admin-configurable). Readable by authenticated users.
create table if not exists public.lead_usage_limits (
  plan           text primary key,                  -- free | creator | pro | agency
  access_level   text not null default 'none',      -- none | limited | full | advanced
  monthly_leads  integer not null default 0,
  daily_sends    integer not null default 0,
  automated_send boolean not null default false,
  updated_at     timestamptz not null default now()
);
insert into public.lead_usage_limits (plan, access_level, monthly_leads, daily_sends, automated_send) values
  ('free',    'none',     0,     0,    false),
  ('creator', 'limited',  100,   0,    false),
  ('pro',     'full',     2000,  500,  true),
  ('agency',  'advanced', 10000, 2000, true)
on conflict (plan) do nothing;

create table if not exists public.lead_usage_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  action     text not null,   -- search|verify|export|sync|send|blocked_send|compliance_accept|admin_override|dnc_update|unsubscribe
  quantity   integer not null default 1,
  detail     text,
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_usage_logs_user on public.lead_usage_logs(user_id, created_at desc);
create index if not exists idx_lead_usage_logs_action on public.lead_usage_logs(action, created_at desc);

-- Manual review: a send requires an approval record confirming compliance.
create table if not exists public.lead_send_approvals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  email_campaign_id uuid,
  list_id           uuid,
  recipients        integer not null default 0,
  confirmed_compliance boolean not null default false,
  approved          boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists idx_lead_send_approvals_user on public.lead_send_approvals(user_id, created_at desc);

create table if not exists public.lead_safety_checks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  email_campaign_id uuid,
  checks_json       jsonb not null default '{}'::jsonb,
  passed            boolean not null default false,
  created_at        timestamptz not null default now()
);

create table if not exists public.lead_admin_actions (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid,
  target_user_id uuid,
  action         text not null,   -- enable | disable | suspend | unsuspend | set_limits | override | review
  detail         text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_lead_admin_actions on public.lead_admin_actions(target_user_id, created_at desc);

-- ---- RLS -----------------------------------------------------------------
alter table public.lead_feature_access       enable row level security;
alter table public.lead_compliance_acceptance enable row level security;
alter table public.lead_sender_profiles      enable row level security;
alter table public.lead_usage_limits         enable row level security;
alter table public.lead_usage_logs           enable row level security;
alter table public.lead_send_approvals       enable row level security;
alter table public.lead_safety_checks        enable row level security;
alter table public.lead_admin_actions        enable row level security;

do $$
begin
  -- Owner read/write on their own data (writes for accept/sender/approvals/safety happen with the user session).
  if not exists (select 1 from pg_policies where tablename='lead_feature_access' and policyname='lfa_own') then
    create policy lfa_own on public.lead_feature_access for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='lead_compliance_acceptance' and policyname='lca_own') then
    create policy lca_own on public.lead_compliance_acceptance for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='lead_sender_profiles' and policyname='lsp_own') then
    create policy lsp_own on public.lead_sender_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='lead_usage_limits' and policyname='lul_read') then
    create policy lul_read on public.lead_usage_limits for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='lead_usage_logs' and policyname='llog_own') then
    create policy llog_own on public.lead_usage_logs for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='lead_send_approvals' and policyname='lsa_own') then
    create policy lsa_own on public.lead_send_approvals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='lead_safety_checks' and policyname='lsc_own') then
    create policy lsc_own on public.lead_safety_checks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  -- lead_admin_actions: no user policies (service-role only).
end $$;
