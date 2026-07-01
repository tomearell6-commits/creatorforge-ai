-- =====================================================================
-- B2B Lead Generator (Business Studio).
--
-- Publicly-available business data only. Every lead stores its source URL; a
-- compliance log records outreach-relevant actions. Owner-only RLS on all
-- tables. Idempotent.
-- =====================================================================

create table if not exists public.lead_campaigns (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  business_type text,
  country       text,
  city          text,
  keywords      text[] not null default '{}',
  source_urls   text[] not null default '{}',
  max_leads     integer not null default 25,
  require_email boolean not null default true,
  verify_emails boolean not null default true,
  sync_to_brevo boolean not null default false,
  status        text not null default 'draft',   -- draft | running | completed | failed
  leads_found   integer not null default 0,
  credits_used  integer not null default 0,
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_lead_campaigns_user on public.lead_campaigns(user_id, created_at desc);

create table if not exists public.leads (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  campaign_id          uuid references public.lead_campaigns(id) on delete set null,
  business_name        text,
  business_type        text,
  website              text,
  source_url           text,                       -- REQUIRED provenance for every lead
  contact_page_url     text,
  email                text,
  phone                text,
  address              text,
  city                 text,
  country              text,
  facebook_url         text,
  instagram_url        text,
  linkedin_url         text,
  business_description  text,
  verification_status  text default 'unknown',     -- valid | invalid | disposable | catchall | unknown | failed
  email_quality_score  integer default 0,
  lead_status          text not null default 'new',-- new|verified|invalid|ready|synced|contacted|opened|clicked|replied|bounced|unsubscribed|do_not_contact
  do_not_contact       boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_leads_user on public.leads(user_id, created_at desc);
create index if not exists idx_leads_campaign on public.leads(campaign_id);
-- Dedup a user's leads by email (case-insensitive) when an email is present.
create unique index if not exists uq_leads_user_email on public.leads(user_id, lower(email)) where email is not null and email <> '';

create table if not exists public.lead_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_lead_lists_user on public.lead_lists(user_id);

create table if not exists public.lead_list_members (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  list_id  uuid not null references public.lead_lists(id) on delete cascade,
  lead_id  uuid not null references public.leads(id) on delete cascade,
  added_at timestamptz not null default now()
);
create unique index if not exists uq_list_member on public.lead_list_members(list_id, lead_id);

create table if not exists public.lead_sources (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  lead_id     uuid references public.leads(id) on delete cascade,
  campaign_id uuid references public.lead_campaigns(id) on delete set null,
  source_url  text not null,
  source_type text,                                -- website | contact_page | directory
  created_at  timestamptz not null default now()
);
create index if not exists idx_lead_sources_lead on public.lead_sources(lead_id);

create table if not exists public.lead_verifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  lead_id    uuid references public.leads(id) on delete cascade,
  email      text,
  result     text not null,                        -- valid | invalid | disposable | catchall | unknown | failed
  score      integer not null default 0,
  provider   text default 'neverbounce',
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_verif_lead on public.lead_verifications(lead_id);

create table if not exists public.lead_outreach_templates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  subject      text not null default '',
  preview_text text,
  body         text not null default '',
  cta_label    text,
  cta_url      text,
  sender_name  text,
  signature    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_lead_templates_user on public.lead_outreach_templates(user_id);

create table if not exists public.lead_email_campaigns (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  template_id       uuid references public.lead_outreach_templates(id) on delete set null,
  list_id           uuid references public.lead_lists(id) on delete set null,
  brevo_campaign_id text,
  name              text not null,
  status            text not null default 'draft', -- draft | synced | sending | sent | failed
  recipients        integer not null default 0,
  sent              integer not null default 0,
  opened            integer not null default 0,
  clicked           integer not null default 0,
  bounced           integer not null default 0,
  unsubscribed      integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_lead_ecamp_user on public.lead_email_campaigns(user_id, created_at desc);

create table if not exists public.lead_email_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.lead_email_campaigns(id) on delete cascade,
  lead_id     uuid references public.leads(id) on delete set null,
  event       text not null,                       -- sent|opened|clicked|replied|bounced|unsubscribed
  email       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_lead_events_campaign on public.lead_email_events(campaign_id);

create table if not exists public.lead_compliance_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  action      text not null,                       -- scan | skip_robots | extract | verify | sync | send | suppress_dnc | suppress_unsub | suppress_invalid
  detail      text,
  lead_id     uuid,
  campaign_id uuid,
  created_at  timestamptz not null default now()
);
create index if not exists idx_lead_compliance_user on public.lead_compliance_logs(user_id, created_at desc);

-- ---- Owner-only RLS on every table --------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'lead_campaigns','leads','lead_lists','lead_list_members','lead_sources',
    'lead_verifications','lead_outreach_templates','lead_email_campaigns',
    'lead_email_events','lead_compliance_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_own') then
      execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_own', t);
    end if;
  end loop;
end $$;
