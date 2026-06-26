-- =====================================================================
-- Phase 2 migration: atomic credit deduction.
-- Run this against an existing database created from schema.sql (v1).
-- Fresh installs already include this function via schema.sql.
-- =====================================================================

create or replace function public.deduct_credits(p_amount integer, p_reason text)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_balance integer;
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

  insert into public.credit_usage (user_id, amount, reason)
  values (uid, -p_amount, p_reason);

  return new_balance;
end;
$$;

grant execute on function public.deduct_credits(integer, text) to authenticated;
