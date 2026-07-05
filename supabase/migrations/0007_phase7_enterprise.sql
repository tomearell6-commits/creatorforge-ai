-- =====================================================================
-- Phase 7 migration: Enterprise platform, admin portal & business ops.
-- Adds 16 tables + profile columns + indexes + RLS. Idempotent.
-- =====================================================================

-- ---------- profile extensions (status / referral) -------------------
alter table public.profiles add column if not exists status text not null default 'active';      -- active | suspended
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references auth.users(id) on delete set null;
create unique index if not exists idx_profiles_referral_code on public.profiles(referral_code) where referral_code is not null;

-- ---------- admin & platform config ----------------------------------
create table if not exists public.admin_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'admin',   -- super_admin | admin | support
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.system_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  description text,
  rollout     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------- referral program -----------------------------------------
create table if not exists public.referrals (
  id               uuid primary key default gen_random_uuid(),
  referrer_id      uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  code             text not null,
  status           text not null default 'pending',  -- pending | converted
  reward_credits   integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
create index if not exists idx_referrals_code on public.referrals(code);

create table if not exists public.referral_rewards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  type        text not null default 'credits',  -- credits | cash
  amount      numeric not null default 0,
  status      text not null default 'pending',  -- pending | granted | paid
  created_at  timestamptz not null default now()
);
create index if not exists idx_referral_rewards_user on public.referral_rewards(user_id);

-- ---------- affiliate program ----------------------------------------
create table if not exists public.affiliate_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  code            text not null unique,
  status          text not null default 'active',   -- pending | active | suspended
  commission_rate numeric not null default 0.30,
  payout_method   text,
  balance         numeric not null default 0,
  created_at      timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.affiliate_clicks (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_accounts(id) on delete cascade,
  ref_code     text not null,
  ip           text,
  user_agent   text,
  landing_path text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_aff_clicks_aff on public.affiliate_clicks(affiliate_id);

create table if not exists public.affiliate_commissions (
  id               uuid primary key default gen_random_uuid(),
  affiliate_id     uuid not null references public.affiliate_accounts(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  amount           numeric not null default 0,
  status           text not null default 'pending',  -- pending | approved | paid
  source           text,                             -- subscription | credit
  created_at       timestamptz not null default now()
);
create index if not exists idx_aff_comm_aff on public.affiliate_commissions(affiliate_id);

-- ---------- API management -------------------------------------------
create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'API key',
  key_prefix    text not null,
  key_hash      text not null,             -- sha256 of the secret; plaintext shown once
  scopes        text[] not null default '{}',
  rate_limit    integer not null default 60,
  request_count integer not null default 0,
  last_used_at  timestamptz,
  revoked       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_api_keys_user on public.api_keys(user_id);
create index if not exists idx_api_keys_prefix on public.api_keys(key_prefix);

-- ---------- support center -------------------------------------------
create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  subject    text not null,
  status     text not null default 'open',     -- open | pending | resolved | closed
  priority   text not null default 'normal',   -- low | normal | high | urgent
  category   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tickets_user on public.support_tickets(user_id);
create index if not exists idx_tickets_status on public.support_tickets(status);

create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  is_staff    boolean not null default false,
  body        text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_messages_ticket on public.support_messages(ticket_id);

-- ---------- audit, monitoring, billing, sessions ---------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  actor_email text,
  action      text not null,
  target_type text,
  target_id   text,
  ip          text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_user on public.audit_logs(user_id);
create index if not exists idx_audit_action on public.audit_logs(action);
create index if not exists idx_audit_time on public.audit_logs(created_at);

create table if not exists public.platform_notifications (
  id         uuid primary key default gen_random_uuid(),
  audience   text not null default 'all',   -- all | admins | user
  user_id    uuid references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  level      text not null default 'info',  -- info | warning | critical
  created_at timestamptz not null default now()
);

create table if not exists public.system_metrics (
  id         uuid primary key default gen_random_uuid(),
  metric     text not null,
  value      numeric not null default 0,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_metrics_metric on public.system_metrics(metric, created_at);

create table if not exists public.billing_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  type        text not null,    -- payment | refund | renewal | chargeback
  amount      numeric not null default 0,
  currency    text not null default 'USD',
  provider    text,
  provider_ref text,
  status      text not null default 'completed',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_billing_user on public.billing_events(user_id);

create table if not exists public.user_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  ip           text,
  user_agent   text,
  last_seen_at timestamptz not null default now(),
  revoked      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_sessions_user on public.user_sessions(user_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.admin_users           enable row level security;
alter table public.system_settings       enable row level security;
alter table public.feature_flags         enable row level security;
alter table public.referrals             enable row level security;
alter table public.referral_rewards      enable row level security;
alter table public.affiliate_accounts    enable row level security;
alter table public.affiliate_clicks      enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.api_keys              enable row level security;
alter table public.support_tickets       enable row level security;
alter table public.support_messages      enable row level security;
alter table public.audit_logs            enable row level security;
alter table public.platform_notifications enable row level security;
alter table public.system_metrics        enable row level security;
alter table public.billing_events        enable row level security;
alter table public.user_sessions         enable row level security;

-- Owner-based policies for user-owned tables.
do $$
declare t text;
begin
  foreach t in array array[
    'referral_rewards','affiliate_accounts','api_keys',
    'support_tickets','user_sessions'
  ]
  loop
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner" on public.%I
         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t, t
    );
  end loop;
end $$;

-- referrals: the referrer owns the row.
drop policy if exists "referrals_owner" on public.referrals;
create policy "referrals_owner" on public.referrals
  for all using (auth.uid() = referrer_id) with check (auth.uid() = referrer_id);

-- support_messages: visible to the ticket owner (staff/admin use service role).
drop policy if exists "support_messages_owner" on public.support_messages;
create policy "support_messages_owner" on public.support_messages
  for all using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

-- affiliate_commissions: the affiliate owner can read theirs.
drop policy if exists "affiliate_commissions_owner" on public.affiliate_commissions;
create policy "affiliate_commissions_owner" on public.affiliate_commissions
  for select using (
    exists (select 1 from public.affiliate_accounts a where a.id = affiliate_id and a.user_id = auth.uid())
  );

-- audit_logs: a user can read + append their own entries (admin uses service role).
drop policy if exists "audit_owner" on public.audit_logs;
create policy "audit_owner" on public.audit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- feature_flags: world-readable (gates client features).
drop policy if exists "feature_flags_read" on public.feature_flags;
create policy "feature_flags_read" on public.feature_flags for select using (true);

-- platform_notifications: read broadcasts or your own.
drop policy if exists "platform_notifications_read" on public.platform_notifications;
create policy "platform_notifications_read" on public.platform_notifications
  for select using (audience = 'all' or user_id = auth.uid());

-- admin_users, system_settings, affiliate_clicks, system_metrics, billing_events:
-- no permissive policy → only the service-role (admin endpoints) can access.

-- ---------- seed default platform settings + feature flags -----------
insert into public.system_settings (key, value) values
  ('white_label_default', '{"brandName":"CreatorsForge AI","brandColor":"#7c3aed","logoUrl":null}'::jsonb),
  ('billing', '{"coupons":[],"creditPackages":[]}'::jsonb)
on conflict (key) do nothing;

insert into public.feature_flags (key, enabled, description) values
  ('affiliate_program', true,  'Affiliate center enabled'),
  ('referral_program',  true,  'Referral program enabled'),
  ('white_label',       false, 'White-label customization enabled')
on conflict (key) do nothing;
