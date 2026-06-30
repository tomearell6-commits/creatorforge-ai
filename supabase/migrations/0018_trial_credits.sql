-- =====================================================================
-- Free Trial credit bump: 20 -> 50.
-- New signups inherit profiles.credits default; raise it so trial users get
-- enough credits to try a few studios before the upgrade prompt.
-- Idempotent: safe to re-run.
-- =====================================================================

alter table public.profiles alter column credits set default 50;

-- Top up existing free-trial users who are still on the old 20-credit default
-- (only those at exactly 20 on the free plan, so we don't overwrite usage).
update public.profiles
  set credits = 50
  where plan = 'free' and credits = 20;
