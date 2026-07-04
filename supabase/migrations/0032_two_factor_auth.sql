-- =====================================================================
-- Two-Factor Authentication (Settings → Security → Two-Factor Authentication).
--
-- user_2fa_settings      one row per user; TOTP secret is AES-256-GCM encrypted
--                        server-side (enc:v1:), never exposed after setup.
-- user_2fa_backup_codes  10 one-time codes, SHA-256 hashes only.
-- user_2fa_challenges    short-lived email verification codes (hashed) for the
--                        email method and high-risk action confirmation.
-- security_settings      platform singleton: admin 2FA enforcement flag.
--
-- Users may READ their own 2FA status (middleware checks it); ALL writes go
-- through service-role API routes so secrets/hashes can't be tampered with.
-- Idempotent.
-- =====================================================================

create table if not exists public.user_2fa_settings (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  method            text not null default 'totp' check (method in ('totp','email')),
  secret_encrypted  text,                          -- TOTP only; enc:v1: AES-256-GCM
  enabled           boolean not null default false, -- false during setup until verified
  enabled_at        timestamptz,
  last_verified_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.user_2fa_backup_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  code_hash  text not null,                        -- sha256 hex; plaintext never stored
  used       boolean not null default false,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_2fa_backup_user on public.user_2fa_backup_codes(user_id, used);

create table if not exists public.user_2fa_challenges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  purpose    text not null check (purpose in ('login','action','setup')),
  code_hash  text not null,                        -- sha256 hex of emailed 6-digit code
  attempts   int  not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_2fa_challenges_user on public.user_2fa_challenges(user_id, purpose, created_at desc);

create table if not exists public.security_settings (
  id                 int primary key default 1 check (id = 1),  -- singleton
  enforce_admin_2fa  boolean not null default false,
  updated_by         uuid references auth.users(id) on delete set null,
  updated_at         timestamptz not null default now()
);
insert into public.security_settings (id) values (1) on conflict (id) do nothing;

alter table public.user_2fa_settings     enable row level security;
alter table public.user_2fa_backup_codes enable row level security;
alter table public.user_2fa_challenges   enable row level security;
alter table public.security_settings     enable row level security;

-- Users read their own 2FA status (never the secret column via API design;
-- RLS can't hide columns, but secret_encrypted is useless without SECRETS_KEY).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_2fa_settings' and policyname='u2fa_settings_select_own') then
    create policy u2fa_settings_select_own on public.user_2fa_settings
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_2fa_backup_codes' and policyname='u2fa_backup_select_own') then
    create policy u2fa_backup_select_own on public.user_2fa_backup_codes
      for select using (auth.uid() = user_id);
  end if;
end $$;
-- user_2fa_challenges and security_settings: NO user policies — service role only.
