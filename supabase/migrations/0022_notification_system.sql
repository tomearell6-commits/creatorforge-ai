-- =====================================================================
-- Automated credit & subscription notification system.
--
-- Extends `notifications` with CTA + status fields and adds preferences,
-- delivery logs, dedup events, and admin-editable rules. Owner-only RLS on user
-- tables; rules/logs writes go through the service-role client. Idempotent.
-- =====================================================================

-- 1. Extend the existing notifications table (non-breaking; keeps body/link/read).
alter table public.notifications add column if not exists status    text not null default 'unread';
alter table public.notifications add column if not exists cta_label text;
alter table public.notifications add column if not exists cta_url   text;
alter table public.notifications add column if not exists read_at   timestamptz;

-- 2. Per-user channel preferences. Missing row ⇒ treat everything as enabled.
create table if not exists public.notification_preferences (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  email_credit       boolean not null default true,
  email_subscription boolean not null default true,
  email_payment      boolean not null default true,   -- payment/security: cannot be disabled by UI
  inapp_credit       boolean not null default true,
  inapp_subscription boolean not null default true,
  weekly_summary     boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 3. Delivery audit — one row per channel attempt (email/in-app).
create table if not exists public.notification_delivery_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  notification_type   text not null,
  channel             text not null,                  -- email | in_app
  status              text not null,                  -- sent | failed | skipped
  provider            text,                           -- brevo | in_app
  provider_message_id text,
  error_message       text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists idx_notif_logs_user on public.notification_delivery_logs(user_id, created_at desc);
create index if not exists idx_notif_logs_type on public.notification_delivery_logs(notification_type, status);

-- 4. Dedup ledger — prevents re-sending the same threshold within a period.
create table if not exists public.notification_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  threshold         text not null default '',   -- '25' | '10' | '0' | '14' | '7' | '3' | '1' | ''
  billing_period    text not null default '',   -- e.g. renewal date / month; resets dedup per cycle
  subscription_id   text,
  created_at        timestamptz not null default now()
);
create unique index if not exists uq_notif_events on public.notification_events(user_id, notification_type, threshold, billing_period);

-- 5. Admin-editable rules (thresholds / reminder days). Service-role managed.
create table if not exists public.notification_rules (
  id          text primary key,      -- 'credit_thresholds' | 'subscription_reminders'
  config      jsonb not null default '{}'::jsonb,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now()
);

insert into public.notification_rules (id, config) values
  ('credit_thresholds',       '{"percentages":[25,10,0]}'::jsonb),
  ('subscription_reminders',  '{"days":[14,7,3,1]}'::jsonb)
on conflict (id) do nothing;

-- ---- RLS -----------------------------------------------------------------
alter table public.notification_preferences   enable row level security;
alter table public.notification_delivery_logs enable row level security;
alter table public.notification_events        enable row level security;
alter table public.notification_rules         enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='notification_preferences' and policyname='np_own') then
    create policy np_own on public.notification_preferences for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='notification_delivery_logs' and policyname='ndl_select_own') then
    create policy ndl_select_own on public.notification_delivery_logs for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='notification_events' and policyname='ne_select_own') then
    create policy ne_select_own on public.notification_events for select using (auth.uid() = user_id);
  end if;
  -- notification_rules: no user policies — only the service-role client (admin) may read/write.
end $$;
