-- =====================================================================
-- AI Email Assistant (Business Studio).
--
-- Connect an email account (OAuth — never raw passwords), scan the inbox,
-- classify messages, surface what needs attention, draft replies, and send
-- ONLY with user approval or explicitly safe automation rules.
--
-- SECURITY MODEL
--  - email_provider_tokens holds AES-256-GCM-ENCRYPTED OAuth tokens and is
--    RLS-enabled with NO policies: readable only by the service role inside
--    server routes. Tokens never reach the browser.
--  - All other tables are owner-RLS (auth.uid() = user_id) — users see only
--    their own email data; admins see aggregate counts only.
-- Idempotent.
-- =====================================================================

-- ---- Connected accounts ---------------------------------------------------
create table if not exists public.email_accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  provider         text not null default 'gmail',      -- gmail|google-workspace|outlook|microsoft365|imap|demo
  email_address    text not null,
  display_name     text,
  permission_mode  text not null default 'draft_assistant', -- read_summarize|draft_assistant|assisted_automation
  status           text not null default 'connected',  -- connected|paused|error|disconnected
  daily_summary    boolean not null default true,
  notify_critical  boolean not null default true,
  last_synced_at   timestamptz,
  last_sync_error  text,
  consent_at       timestamptz,                        -- when the consent screen was accepted
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, provider, email_address)
);
create index if not exists idx_email_accounts_user on public.email_accounts(user_id);

-- ---- OAuth tokens (ENCRYPTED, service-role only) --------------------------
create table if not exists public.email_provider_tokens (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references public.email_accounts(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  access_token_enc   text,                              -- encryptSecret() output
  refresh_token_enc  text,
  token_expires_at   timestamptz,
  scopes             text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (account_id)
);

-- ---- Synced messages (headers + snippet; body only when needed) -----------
create table if not exists public.email_messages (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references public.email_accounts(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  provider_msg_id  text not null,
  thread_id        text,
  from_name        text,
  from_address     text,
  subject          text,
  snippet          text,
  body_text        text,
  received_at      timestamptz,
  is_read          boolean not null default false,
  is_demo          boolean not null default false,      -- demo-inbox rows are clearly flagged
  created_at       timestamptz not null default now(),
  unique (account_id, provider_msg_id)
);
create index if not exists idx_email_messages_user on public.email_messages(user_id, received_at desc);
create index if not exists idx_email_messages_account on public.email_messages(account_id, received_at desc);

-- ---- AI classifications -----------------------------------------------------
create table if not exists public.email_classifications (
  id             uuid primary key default gen_random_uuid(),
  message_id     uuid not null references public.email_messages(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  category       text not null default 'needs_reply',   -- urgent|needs_reply|waiting|support|sales_lead|billing|partnership|newsletter|low_priority|personal|follow_up
  priority       text not null default 'medium',        -- critical|high|medium|low
  summary        text,
  needs_reply    boolean not null default false,
  is_sensitive   boolean not null default false,        -- auto-send is ALWAYS blocked when true
  deadline       date,
  used_ai        boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (message_id)
);
create index if not exists idx_email_class_user on public.email_classifications(user_id, priority);

-- ---- Draft replies ----------------------------------------------------------
create table if not exists public.email_draft_replies (
  id             uuid primary key default gen_random_uuid(),
  message_id     uuid not null references public.email_messages(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  tone           text not null default 'professional',  -- professional|friendly|direct|apologetic|sales|support
  draft_text     text not null,
  status         text not null default 'suggested',     -- suggested|edited|approved|sent|rejected
  sent_at        timestamptz,
  used_ai        boolean not null default false,
  credits_used   integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_email_drafts_user on public.email_draft_replies(user_id, status);

-- ---- Needs-attention items ---------------------------------------------------
create table if not exists public.email_attention_items (
  id               uuid primary key default gen_random_uuid(),
  message_id       uuid not null references public.email_messages(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  reason           text not null,
  suggested_action text,
  priority         text not null default 'medium',
  deadline         date,
  resolved         boolean not null default false,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (message_id)
);
create index if not exists idx_email_attention_user on public.email_attention_items(user_id, resolved, priority);

-- ---- Automation rules ----------------------------------------------------------
create table if not exists public.email_automation_rules (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid references public.email_accounts(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  trigger_category text not null,                      -- category the rule matches
  action        text not null default 'draft_reply',   -- draft_reply|alert|label|follow_up
  tone          text default 'professional',
  is_active     boolean not null default true,
  runs_count    integer not null default 0,
  last_run_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_email_rules_user on public.email_automation_rules(user_id, is_active);

-- ---- Activity log (sensitive-action audit trail) --------------------------------
create table if not exists public.email_activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  account_id  uuid,
  action      text not null,                            -- connect|disconnect|sync|classify|draft|send|rule_run|delete_data
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_email_activity_user on public.email_activity_logs(user_id, created_at desc);

-- ---- Daily summary reports -------------------------------------------------------
create table if not exists public.email_summary_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  account_id    uuid references public.email_accounts(id) on delete cascade,
  report_date   date not null default current_date,
  summary_json  jsonb not null default '{}'::jsonb,
  emailed       boolean not null default false,
  credits_used  integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (user_id, account_id, report_date)
);
create index if not exists idx_email_reports_user on public.email_summary_reports(user_id, report_date desc);

-- ---- RLS ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'email_accounts','email_messages','email_classifications','email_draft_replies',
    'email_attention_items','email_automation_rules','email_activity_logs','email_summary_reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_own') then
      execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_own', t);
    end if;
  end loop;
end $$;

-- Tokens: RLS enabled, NO policies — service-role access only. Encrypted at rest.
alter table public.email_provider_tokens enable row level security;
