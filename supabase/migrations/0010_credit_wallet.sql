-- =====================================================================
-- Phase 8 migration: Credit Wallet & Crypto Credit Top-Up System.
--
-- Design principles
-- -----------------
-- * profiles.credits stays the single AUTHORITATIVE spendable total, so every
--   existing deductCredits() call site keeps working unchanged.
-- * credit_ledger is an append-only audit trail — balances are NEVER overwritten
--   directly; every change is a signed ledger row with the running balance.
-- * credit_wallets is a per-user cache of the breakdown (monthly / bonus /
--   purchased / used) kept in sync by SECURITY DEFINER functions.
-- * Spending draws down buckets in priority order: monthly -> bonus -> purchased
--   (use the renewing/free credits first, preserve paid credits last).
--
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------- credit_packages (admin-managed catalogue) ----------------
create table if not exists public.credit_packages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,           -- starter | small | creator | growth | business | enterprise
  name        text not null,
  usd_price   numeric(10,2) not null,
  credits     integer not null,
  bonus       integer not null default 0,     -- extra credits granted on top
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- credit_wallets (per-user cached breakdown) ---------------
create table if not exists public.credit_wallets (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  monthly_credits   integer not null default 0,   -- granted at renewal (resets)
  bonus_credits     integer not null default 0,   -- promotional / referral / admin gifts
  purchased_credits integer not null default 0,   -- bought via top-up (never expires)
  used_credits      integer not null default 0,   -- lifetime consumed
  renewal_date      timestamptz,                  -- next monthly reset
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- credit_ledger (append-only source of truth) --------------
create table if not exists public.credit_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  entry_type    text not null,            -- monthly_renewal | topup_purchase | refund | bonus | promo | manual_adjustment | generation | rendering | publishing | admin_adjustment
  bucket        text not null default 'monthly', -- monthly | bonus | purchased
  amount        integer not null,         -- signed: +granted / -consumed
  balance_after integer not null,         -- profiles.credits after this entry
  reason        text,
  reference     text,                     -- external ref (charge id, action id…)
  created_at    timestamptz not null default now()
);
create index if not exists idx_credit_ledger_user on public.credit_ledger(user_id, created_at desc);
create index if not exists idx_credit_ledger_type on public.credit_ledger(entry_type);

-- ---------- credit_transactions (history UI rows) --------------------
create table if not exists public.credit_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null,         -- purchase | bonus | refund | renewal | usage | adjustment
  credit_amount    integer not null,      -- signed
  usd_amount       numeric(10,2),
  crypto_currency  text,                  -- BTC | ETH | USDT | USDC | LTC | SOL
  payment_status   text not null default 'completed', -- pending | confirming | completed | failed | refunded
  payment_method   text,                  -- crypto | subscription | system | admin
  payment_reference text,                 -- order id / invoice id
  transaction_id   text,                  -- on-chain or provider txn id
  package_slug     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_credit_txn_user on public.credit_transactions(user_id, created_at desc);
create index if not exists idx_credit_txn_status on public.credit_transactions(payment_status);

-- ---------- credit_purchases (top-up orders) -------------------------
create table if not exists public.credit_purchases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  package_id      uuid references public.credit_packages(id) on delete set null,
  package_slug    text,
  credits         integer not null,
  usd_amount      numeric(10,2) not null,
  processing_fee  numeric(10,2) not null default 0,
  status          text not null default 'pending', -- pending | confirming | completed | failed | expired
  payment_reference text,                 -- order id used by provider/webhook
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_credit_purchases_user on public.credit_purchases(user_id, created_at desc);
create index if not exists idx_credit_purchases_ref on public.credit_purchases(payment_reference);

-- ---------- crypto_payment_requests ----------------------------------
create table if not exists public.crypto_payment_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  purchase_id     uuid references public.credit_purchases(id) on delete cascade,
  provider        text not null default 'nowpayments',
  order_reference text not null,          -- "topup|<userId>|<purchaseId>"
  crypto_currency text,                   -- selected coin (may be chosen on hosted page)
  pay_address     text,                   -- wallet address / payment request (provider-supplied)
  amount_usd      numeric(10,2) not null,
  amount_crypto   numeric(24,10),
  invoice_url     text,
  status          text not null default 'waiting', -- waiting | confirming | confirmed | finished | expired | failed
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_crypto_req_user on public.crypto_payment_requests(user_id, created_at desc);
create index if not exists idx_crypto_req_order on public.crypto_payment_requests(order_reference);

-- ---------- crypto_payment_confirmations -----------------------------
create table if not exists public.crypto_payment_confirmations (
  id                 uuid primary key default gen_random_uuid(),
  payment_request_id uuid references public.crypto_payment_requests(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  tx_hash            text,
  confirmation_count integer not null default 0,
  payment_status     text,                -- partially_paid | confirming | confirmed | finished
  raw_payload        jsonb,
  confirmed_at       timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists idx_crypto_conf_req on public.crypto_payment_confirmations(payment_request_id);

-- ---------- wallet_notifications -------------------------------------
create table if not exists public.wallet_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,              -- low_20 | low_10 | exhausted | credits_added | payment_pending | payment_confirmed | refund_processed | renewed
  title       text not null,
  body        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_wallet_notif_user on public.wallet_notifications(user_id, created_at desc);

-- ---------- wallet_settings (auto top-up) ----------------------------
create table if not exists public.wallet_settings (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  auto_topup_enabled boolean not null default false,
  threshold_credits  integer not null default 100,
  package_slug       text,
  preferred_currency text default 'USDT',
  confirm_required   boolean not null default true,
  updated_at         timestamptz not null default now()
);

-- =====================================================================
-- Functions
-- =====================================================================

-- Ensure a wallet row exists, seeded from the user's current profile.
create or replace function public.wallet_ensure(p_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.credit_wallets (user_id, monthly_credits, renewal_date)
  select p_user, coalesce(pr.credits, 0), (now() + interval '30 days')
  from public.profiles pr where pr.user_id = p_user
  on conflict (user_id) do nothing;
end;
$$;

-- Grant credits into a bucket. Updates profiles.credits (authoritative),
-- the wallet cache, the ledger, and the legacy credit_usage log atomically.
-- Returns the new spendable balance.
create or replace function public.wallet_credit(
  p_user uuid, p_amount integer, p_bucket text, p_type text,
  p_reason text default null, p_reference text default null
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare new_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    return null;
  end if;
  perform public.wallet_ensure(p_user);

  update public.profiles set credits = credits + p_amount
    where user_id = p_user
    returning credits into new_balance;
  if new_balance is null then
    return null;
  end if;

  update public.credit_wallets set
    monthly_credits   = monthly_credits   + (case when p_bucket = 'monthly'   then p_amount else 0 end),
    bonus_credits     = bonus_credits     + (case when p_bucket = 'bonus'     then p_amount else 0 end),
    purchased_credits = purchased_credits + (case when p_bucket = 'purchased' then p_amount else 0 end),
    updated_at = now()
    where user_id = p_user;

  insert into public.credit_ledger (user_id, entry_type, bucket, amount, balance_after, reason, reference)
  values (p_user, p_type, p_bucket, p_amount, new_balance, p_reason, p_reference);

  insert into public.credit_usage (user_id, amount, reason)
  values (p_user, p_amount, coalesce(p_reason, p_type));

  return new_balance;
end;
$$;

-- Reset monthly credits to a plan allowance (renewal). Clears the prior monthly
-- bucket and grants the new allowance, recording the net change in the ledger.
create or replace function public.wallet_renew_monthly(p_user uuid, p_allowance integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare prev_monthly integer; new_balance integer;
begin
  perform public.wallet_ensure(p_user);
  select monthly_credits into prev_monthly from public.credit_wallets where user_id = p_user;

  update public.profiles set credits = credits - coalesce(prev_monthly,0) + p_allowance
    where user_id = p_user returning credits into new_balance;

  update public.credit_wallets set
    monthly_credits = p_allowance,
    renewal_date = now() + interval '30 days',
    updated_at = now()
    where user_id = p_user;

  insert into public.credit_ledger (user_id, entry_type, bucket, amount, balance_after, reason)
  values (p_user, 'monthly_renewal', 'monthly', p_allowance - coalesce(prev_monthly,0), new_balance, 'Monthly credit renewal');

  return new_balance;
end;
$$;

-- Replace deduct_credits so every existing call site also draws down wallet
-- buckets (monthly -> bonus -> purchased) and writes a ledger row. Keeps the
-- legacy credit_usage insert for backward compatibility. Atomic; returns the
-- new balance or NULL when funds are insufficient.
create or replace function public.deduct_credits(p_amount integer, p_reason text)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_balance integer;
  remaining integer;
  take_m integer; take_b integer; take_p integer;
  m integer; b integer; p integer;
begin
  if uid is null or p_amount <= 0 then
    return null;
  end if;

  update public.profiles
    set credits = credits - p_amount
    where user_id = uid and credits >= p_amount
    returning credits into new_balance;

  if new_balance is null then
    return null; -- insufficient credits (or no profile row)
  end if;

  -- Legacy ledger (kept for back-compat with existing analytics).
  insert into public.credit_usage (user_id, amount, reason)
  values (uid, -p_amount, p_reason);

  -- Draw down wallet buckets in priority order, if a wallet exists.
  perform public.wallet_ensure(uid);
  select monthly_credits, bonus_credits, purchased_credits into m, b, p
    from public.credit_wallets where user_id = uid;

  remaining := p_amount;
  take_m := least(m, remaining); remaining := remaining - take_m;
  take_b := least(b, remaining); remaining := remaining - take_b;
  take_p := least(p, remaining); remaining := remaining - take_p;

  update public.credit_wallets set
    monthly_credits   = monthly_credits   - take_m,
    bonus_credits     = bonus_credits     - take_b,
    purchased_credits = purchased_credits - take_p,
    used_credits      = used_credits      + p_amount,
    updated_at = now()
    where user_id = uid;

  insert into public.credit_ledger (user_id, entry_type, bucket, amount, balance_after, reason)
  values (uid, 'generation', 'monthly', -p_amount, new_balance, p_reason);

  return new_balance;
end;
$$;

grant execute on function public.deduct_credits(integer, text) to authenticated;

-- Admin/ledger signed adjustment (bonus, refund, manual + or -). Positive adds to
-- the bonus bucket; negative draws down monthly -> bonus -> purchased. Updates
-- profiles.credits, the wallet cache, and the ledger atomically. Returns the new
-- balance, or NULL if a negative adjustment would overdraw. Intended to be called
-- from the service-role admin client only.
create or replace function public.wallet_adjust(
  p_user uuid, p_amount integer, p_type text, p_reason text default null
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  new_balance integer; remaining integer;
  take_m integer; take_b integer; take_p integer; m integer; b integer; p integer;
begin
  if p_amount = 0 then return null; end if;
  perform public.wallet_ensure(p_user);

  if p_amount > 0 then
    return public.wallet_credit(p_user, p_amount, 'bonus', p_type, p_reason, null);
  end if;

  -- Negative: ensure sufficient balance, then draw down buckets.
  update public.profiles set credits = credits + p_amount
    where user_id = p_user and credits >= (-p_amount)
    returning credits into new_balance;
  if new_balance is null then return null; end if;

  select monthly_credits, bonus_credits, purchased_credits into m, b, p
    from public.credit_wallets where user_id = p_user;
  remaining := -p_amount;
  take_m := least(m, remaining); remaining := remaining - take_m;
  take_b := least(b, remaining); remaining := remaining - take_b;
  take_p := least(p, remaining); remaining := remaining - take_p;

  update public.credit_wallets set
    monthly_credits = monthly_credits - take_m,
    bonus_credits = bonus_credits - take_b,
    purchased_credits = purchased_credits - take_p,
    updated_at = now()
    where user_id = p_user;

  insert into public.credit_ledger (user_id, entry_type, bucket, amount, balance_after, reason)
  values (p_user, p_type, 'monthly', p_amount, new_balance, p_reason);

  return new_balance;
end;
$$;

-- =====================================================================
-- RLS — owner-only read on user-scoped tables; packages are world-readable.
-- Writes happen via SECURITY DEFINER functions / the service-role webhook.
-- =====================================================================
alter table public.credit_wallets               enable row level security;
alter table public.credit_ledger                enable row level security;
alter table public.credit_transactions          enable row level security;
alter table public.credit_purchases             enable row level security;
alter table public.crypto_payment_requests      enable row level security;
alter table public.crypto_payment_confirmations enable row level security;
alter table public.wallet_notifications         enable row level security;
alter table public.wallet_settings              enable row level security;
alter table public.credit_packages              enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'credit_wallets','credit_ledger','credit_transactions','credit_purchases',
    'crypto_payment_requests','crypto_payment_confirmations','wallet_notifications','wallet_settings'
  ]
  loop
    execute format('drop policy if exists "%s_owner_read" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner_read" on public.%I for select using (auth.uid() = user_id);', t, t);
  end loop;
end $$;

-- wallet_settings: let users manage their own auto top-up settings directly.
drop policy if exists "wallet_settings_owner_write" on public.wallet_settings;
create policy "wallet_settings_owner_write" on public.wallet_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- credit_packages: anyone (incl. anon) can read the active catalogue.
drop policy if exists "credit_packages_read" on public.credit_packages;
create policy "credit_packages_read" on public.credit_packages
  for select using (true);

-- =====================================================================
-- Seed the default package catalogue (idempotent on slug).
-- =====================================================================
insert into public.credit_packages (slug, name, usd_price, credits, bonus, sort_order) values
  ('starter',    'Starter Pack',    10,  1000,  0, 1),
  ('small',      'Small Creator',   25,  3000,  0, 2),
  ('creator',    'Creator Pack',    50,  7000,  0, 3),
  ('growth',     'Growth Pack',     100, 15000, 0, 4),
  ('business',   'Business Pack',   250, 40000, 0, 5),
  ('enterprise', 'Enterprise Pack', 500, 90000, 0, 6)
on conflict (slug) do nothing;
