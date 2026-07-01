-- =====================================================================
-- Account security event log.
--
-- Records password-reset requests/completions and password changes for audit
-- and suspicious-activity review. user_id is nullable because reset REQUESTS
-- happen pre-authentication (we never reveal whether an email exists, so we
-- don't resolve it to a user at request time). Writes go through the
-- service-role admin client; users may read only their own events. Idempotent.
-- =====================================================================

create table if not exists public.security_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  event_type  text not null,   -- PASSWORD_RESET_REQUESTED | PASSWORD_RESET_COMPLETED | PASSWORD_CHANGED | PASSWORD_CHANGE_FAILED | SUSPICIOUS_ACTIVITY
  ip_address  text,
  user_agent  text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_security_events_user on public.security_events(user_id, created_at desc);
create index if not exists idx_security_events_type on public.security_events(event_type, created_at desc);

alter table public.security_events enable row level security;

-- Users can read only their own security history. No user INSERT/UPDATE/DELETE:
-- all writes are performed server-side with the service-role key.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'security_events' and policyname = 'security_events_select_own'
  ) then
    create policy security_events_select_own on public.security_events
      for select using (auth.uid() = user_id);
  end if;
end $$;
