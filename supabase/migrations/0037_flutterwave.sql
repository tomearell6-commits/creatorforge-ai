-- 0037_flutterwave.sql — Flutterwave (card + mobile money) payments
-- ADDITIVE and fully independent of the crypto payment flow. Does not alter
-- any existing table. Tracks Flutterwave card/mobile-money checkouts so the
-- webhook can grant credits/plans exactly once.

create table if not exists public.flutterwave_payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  tx_ref       text not null unique,          -- our reference, echoed by Flutterwave
  kind         text not null check (kind in ('topup','plan')),
  plan         text,                           -- for kind='plan'
  credits      int  not null default 0,        -- for kind='topup'
  amount_usd   numeric not null,
  currency     text not null default 'USD',
  status       text not null default 'pending' check (status in ('pending','successful','failed')),
  flw_tx_id    text,                           -- Flutterwave transaction id (verified)
  flw_ref      text,                           -- Flutterwave flw_ref
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists flw_payments_user_idx   on public.flutterwave_payments (user_id, created_at desc);
create index if not exists flw_payments_txref_idx   on public.flutterwave_payments (tx_ref);
create index if not exists flw_payments_status_idx  on public.flutterwave_payments (status);

alter table public.flutterwave_payments enable row level security;

-- Owner can read + create their own pending payments; only the service role
-- (webhook) updates status / grants credits (no update/delete policy).
drop policy if exists flw_payments_select_own on public.flutterwave_payments;
create policy flw_payments_select_own on public.flutterwave_payments
  for select using (auth.uid() = user_id);

drop policy if exists flw_payments_insert_own on public.flutterwave_payments;
create policy flw_payments_insert_own on public.flutterwave_payments
  for insert with check (auth.uid() = user_id);

create or replace function public.flutterwave_payments_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists flw_payments_touch on public.flutterwave_payments;
create trigger flw_payments_touch
  before update on public.flutterwave_payments
  for each row execute function public.flutterwave_payments_touch();
