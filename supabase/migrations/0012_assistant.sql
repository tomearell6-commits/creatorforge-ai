-- =====================================================================
-- Forge AI Assistant — live chat help widget.
--
-- Free allowance (default 10/month) then credits per reply. All accounting is
-- server-side; credits are deducted via deduct_credits() (which also writes the
-- wallet ledger) only AFTER a successful reply, reason 'AI_ASSISTANT_MESSAGE'.
--
-- Idempotent: safe to re-run.
-- =====================================================================

create table if not exists public.assistant_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_assistant_conv_user on public.assistant_conversations(user_id, updated_at desc);

create table if not exists public.assistant_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null,             -- user | assistant
  message         text not null,
  credit_cost     integer not null default 0,
  status          text not null default 'ok', -- ok | failed
  created_at      timestamptz not null default now()
);
create index if not exists idx_assistant_msg_conv on public.assistant_messages(conversation_id, created_at);
create index if not exists idx_assistant_msg_user on public.assistant_messages(user_id, created_at desc);

create table if not exists public.assistant_usage (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  month              text not null,          -- 'YYYY-MM'
  free_messages_used integer not null default 0,
  paid_messages_used integer not null default 0,
  credits_spent      integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, month)
);
create index if not exists idx_assistant_usage_user on public.assistant_usage(user_id, month);

-- Optional per-user override of the monthly free allowance (else the global default).
create table if not exists public.assistant_free_allowance (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  monthly_free integer not null default 10,
  updated_at   timestamptz not null default now()
);

create table if not exists public.assistant_feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  message_id      uuid references public.assistant_messages(id) on delete set null,
  conversation_id uuid references public.assistant_conversations(id) on delete set null,
  rating          text not null,             -- up | down
  comment         text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_assistant_feedback_user on public.assistant_feedback(user_id, created_at desc);

-- =====================================================================
-- Atomically consume one free assistant message for the month. Returns the new
-- free_messages_used count, or NULL if the free allowance is already exhausted.
-- =====================================================================
create or replace function public.assistant_consume_free(p_user uuid, p_month text, p_limit integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare used integer;
begin
  insert into public.assistant_usage (user_id, month, free_messages_used)
  values (p_user, p_month, 0)
  on conflict (user_id, month) do nothing;

  update public.assistant_usage
    set free_messages_used = free_messages_used + 1, updated_at = now()
    where user_id = p_user and month = p_month and free_messages_used < p_limit
    returning free_messages_used into used;

  return used; -- NULL when the guard (free_messages_used < limit) failed
end;
$$;

grant execute on function public.assistant_consume_free(uuid, text, integer) to authenticated;

-- Record a paid assistant message against the month's usage.
create or replace function public.assistant_record_paid(p_user uuid, p_month text, p_credits integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.assistant_usage (user_id, month, paid_messages_used, credits_spent)
  values (p_user, p_month, 1, p_credits)
  on conflict (user_id, month) do update
    set paid_messages_used = public.assistant_usage.paid_messages_used + 1,
        credits_spent = public.assistant_usage.credits_spent + p_credits,
        updated_at = now();
end;
$$;

grant execute on function public.assistant_record_paid(uuid, text, integer) to authenticated;

-- =====================================================================
-- RLS — owner-only.
-- =====================================================================
alter table public.assistant_conversations   enable row level security;
alter table public.assistant_messages         enable row level security;
alter table public.assistant_usage            enable row level security;
alter table public.assistant_free_allowance   enable row level security;
alter table public.assistant_feedback         enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'assistant_conversations','assistant_messages','assistant_usage',
    'assistant_free_allowance','assistant_feedback'
  ]
  loop
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t, t);
  end loop;
end $$;
