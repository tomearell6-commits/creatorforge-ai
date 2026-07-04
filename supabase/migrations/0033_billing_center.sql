-- =====================================================================
-- Subscription & Billing Center (Dashboard → Subscription & Billing).
--
-- Builds ON TOP of the Credit Wallet (0010: credit_wallets, credit_ledger,
-- credit_transactions, credit_purchases, crypto_* tables) and profiles.plan.
--
-- subscription_plans        admin-editable plan catalog (seeded from config)
-- subscription_features     per-plan feature matrix (comparison table)
-- subscriptions             one row per user: status, cycle, period end
-- billing_history           every billing event (upgrade/renewal/topup/…)
-- payment_methods           user payment preferences — NEVER card data
-- invoice_records           numbered invoices + receipts
-- usage_statistics          daily per-user usage rollups
-- upgrade_recommendations   rule-engine output, deduped, dismissible
-- billing_coupons           promo codes (admin-managed)
--
-- Users read their own rows; plans/features are readable by all signed-in
-- users; ALL writes go through service-role API routes. Idempotent.
-- =====================================================================

create table if not exists public.subscription_plans (
  id             text primary key,              -- 'free' | 'creator' | 'pro' | 'agency' | 'enterprise'
  name           text not null,
  tagline        text,
  monthly_price  numeric(10,2) not null default 0,
  annual_price   numeric(10,2),
  credits        int not null default 0,
  is_custom      boolean not null default false, -- Enterprise: contact sales
  is_active      boolean not null default true,
  badge          text,                           -- 'Most Popular' | 'Recommended' | null
  sort_order     int not null default 0,
  updated_at     timestamptz not null default now()
);

create table if not exists public.subscription_features (
  id          uuid primary key default gen_random_uuid(),
  plan_id     text not null references public.subscription_plans(id) on delete cascade,
  feature_key text not null,
  value       text not null,        -- 'true' | 'false' | a limit like '2000' | 'Unlimited'
  unique (plan_id, feature_key)
);

-- subscriptions already exists in the base schema (user_id, plan, status
-- active|canceled|past_due, provider, provider_sub_id, current_period_end) and
-- is written by the Paddle + crypto webhooks. Extend it in place.
alter table public.subscriptions add column if not exists billing_cycle        text not null default 'monthly';
alter table public.subscriptions add column if not exists started_at           timestamptz not null default now();
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists updated_at           timestamptz not null default now();
create index if not exists idx_subscriptions_user on public.subscriptions(user_id, created_at desc);

create table if not exists public.billing_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null check (event_type in
    ('upgrade','downgrade','renewal','topup','refund','failed_payment','cancelled_payment','coupon_applied')),
  description text not null,
  amount_usd  numeric(10,2),
  plan_id     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_billing_history_user on public.billing_history(user_id, created_at desc);

create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  provider    text not null check (provider in ('paddle','crypto')),
  label       text not null,                -- e.g. 'Card via Paddle' | 'Bitcoin (BTC)'
  details     jsonb not null default '{}'::jsonb, -- non-sensitive only (currency, last4 from Paddle)
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_payment_methods_user on public.payment_methods(user_id);

create table if not exists public.invoice_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  invoice_number  text not null unique,       -- CF-YYYY-NNNNNN
  invoice_date    timestamptz not null default now(),
  plan_id         text,
  description     text not null,
  amount_usd      numeric(10,2) not null,
  status          text not null default 'paid' check (status in ('paid','pending','failed','refunded')),
  payment_method  text not null default 'crypto',
  reference       text,                        -- provider payment/charge id (idempotency)
  metadata        jsonb not null default '{}'::jsonb
);
create index if not exists idx_invoices_user on public.invoice_records(user_id, invoice_date desc);
create unique index if not exists idx_invoices_reference on public.invoice_records(reference) where reference is not null;

create table if not exists public.usage_statistics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  day           date not null,
  credits_used  int not null default 0,
  breakdown     jsonb not null default '{}'::jsonb,  -- {"ai_video": 12, "seo": 4, ...}
  unique (user_id, day)
);

create table if not exists public.upgrade_recommendations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  rec_key      text not null,                  -- rule id (dedupe)
  title        text not null,
  body         text not null,
  cta_label    text not null default 'Upgrade',
  cta_href     text not null default '/dashboard/billing/plans',
  severity     text not null default 'info' check (severity in ('info','warning','critical')),
  dismissed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, rec_key)
);

create table if not exists public.billing_coupons (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  description text,
  kind        text not null default 'bonus_credits_pct' check (kind in ('bonus_credits_pct','bonus_credits_flat')),
  value       int not null,                    -- percent (e.g. 20) or flat credits
  is_active   boolean not null default true,
  max_uses    int,
  used_count  int not null default 0,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ---- Seeds ----------------------------------------------------------------
insert into public.subscription_plans (id, name, tagline, monthly_price, annual_price, credits, is_custom, badge, sort_order) values
  ('free',       'Free Trial',   'Explore every studio',                 0,    null,    50,   false, null,           0),
  ('creator',    'Starter',      'For solo creators getting serious',    19,   190,     500,  false, null,           1),
  ('pro',        'Professional', 'For professionals and small teams',    49,   490,     2000, false, 'Most Popular', 2),
  ('agency',     'Business',     'For agencies and growing businesses',  149,  1490,    8000, false, 'Recommended',  3),
  ('enterprise', 'Enterprise',   'Custom volume, SLAs and onboarding',   0,    null,    0,    true,  null,           4)
on conflict (id) do nothing;

-- ---- RLS ------------------------------------------------------------------
alter table public.subscription_plans       enable row level security;
alter table public.subscription_features    enable row level security;
alter table public.billing_history          enable row level security;
alter table public.payment_methods          enable row level security;
alter table public.invoice_records          enable row level security;
alter table public.usage_statistics         enable row level security;
alter table public.upgrade_recommendations  enable row level security;
alter table public.billing_coupons          enable row level security;

do $$
begin
  -- Catalog: readable by every signed-in user (writes: service role only).
  if not exists (select 1 from pg_policies where tablename='subscription_plans' and policyname='plans_select_all') then
    create policy plans_select_all on public.subscription_plans for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='subscription_features' and policyname='features_select_all') then
    create policy features_select_all on public.subscription_features for select using (auth.role() = 'authenticated');
  end if;
  -- Own-row reads (subscriptions already has an owner policy from the base schema).
  if not exists (select 1 from pg_policies where tablename='billing_history' and policyname='bh_select_own') then
    create policy bh_select_own on public.billing_history for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='payment_methods' and policyname='pm_select_own') then
    create policy pm_select_own on public.payment_methods for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='invoice_records' and policyname='inv_select_own') then
    create policy inv_select_own on public.invoice_records for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='usage_statistics' and policyname='usage_select_own') then
    create policy usage_select_own on public.usage_statistics for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='upgrade_recommendations' and policyname='rec_select_own') then
    create policy rec_select_own on public.upgrade_recommendations for select using (auth.uid() = user_id);
  end if;
  -- billing_coupons: NO user policies — validated server-side only.
end $$;
