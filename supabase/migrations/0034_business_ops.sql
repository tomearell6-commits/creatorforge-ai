-- =====================================================================
-- AI Business Operations Manager (Business Studio flagship).
--
-- company_profiles        one per user: the business identity + brand voice
-- business_products       product catalogue + AI marketing pack (pack_json)
-- business_inquiries      enquiries from forms/manual/import + AI triage
-- inquiry_replies         AI draft replies — approve/edit/reject, NEVER auto-send
-- business_documents      generated docs (quotation/invoice/proposal/…), numbered
-- business_knowledge      text knowledge base injected into AI prompts
-- business_ops_settings   per-user automation mode (manual|assisted|autopilot)
--                         + public inquiry form key
-- business_ops_rules      safe automation rules (auto-draft only; no sending)
-- business_reports        generated business reports (daily/weekly/monthly/…)
-- business_ops_activity   audit trail of every automated action
--
-- Owner RLS everywhere; service-role writes for AI fields. Idempotent.
-- =====================================================================

create table if not exists public.company_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references auth.users(id) on delete cascade,
  company_name     text not null default '',
  description      text,
  industry         text,
  products_summary text,
  services_summary text,
  target_market    text,
  business_hours   text,
  website          text,
  social_links     jsonb not null default '{}'::jsonb,   -- {platform: url}
  contact_email    text,
  contact_phone    text,
  address          text,
  logo_url         text,
  brand_colors     jsonb not null default '[]'::jsonb,   -- ["#84cc16", ...]
  brand_voice      text,
  mission          text,
  story            text,
  certificates     jsonb not null default '[]'::jsonb,   -- [{name, issuer, year}]
  awards           jsonb not null default '[]'::jsonb,
  optimization_json jsonb,                                -- last AI optimization result
  optimization_score int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.business_products (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  category      text,
  price         numeric(12,2),
  currency      text not null default 'USD',
  sku           text,
  description   text,
  specifications jsonb not null default '{}'::jsonb,     -- {label: value}
  image_url     text,
  video_url     text,
  status        text not null default 'draft' check (status in ('draft','published','archived')),
  pack_json     jsonb,                                    -- AI marketing pack (seo/copy/captions/faq/comparison)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_biz_products_user on public.business_products(user_id, created_at desc);

create table if not exists public.business_inquiries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  source         text not null default 'manual' check (source in ('manual','form','email','import')),
  customer_name  text,
  customer_email text,
  customer_phone text,
  subject        text not null default '',
  message        text not null default '',
  category       text,      -- sales | support | general | partnership | quotation | appointment
  priority       text not null default 'normal' check (priority in ('low','normal','high','critical')),
  status         text not null default 'new' check (status in ('new','in_progress','replied','closed','spam')),
  is_sensitive   boolean not null default false,
  ai_summary     text,
  ai_recommendation text,
  deadline       timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_biz_inquiries_user on public.business_inquiries(user_id, status, created_at desc);

create table if not exists public.inquiry_replies (
  id           uuid primary key default gen_random_uuid(),
  inquiry_id   uuid not null references public.business_inquiries(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  draft_text   text not null,
  tone         text not null default 'professional',
  status       text not null default 'draft' check (status in ('draft','approved','rejected','sent')),
  used_ai      boolean not null default false,
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_inquiry_replies_user on public.inquiry_replies(user_id, created_at desc);

create table if not exists public.business_documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  doc_type     text not null,           -- quotation | invoice | proposal | contract_template | purchase_order | capability_statement | company_profile | presentation | report | certificate
  doc_number   text not null,           -- BD-YYYY-NNNN per user
  title        text not null,
  recipient    text,
  content_json jsonb not null default '{}'::jsonb,  -- structured sections/line items
  status       text not null default 'draft' check (status in ('draft','final')),
  used_ai      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_biz_docs_user on public.business_documents(user_id, created_at desc);

create table if not exists public.business_knowledge (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null default 'document' check (kind in ('document','faq','policy','brand_guide','catalogue','sales','pricing','training','marketing')),
  title       text not null,
  content     text not null,            -- plain text (pasted or extracted)
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_biz_knowledge_user on public.business_knowledge(user_id, is_active);

create table if not exists public.business_ops_settings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references auth.users(id) on delete cascade,
  automation_mode text not null default 'manual' check (automation_mode in ('manual','assisted','autopilot')),
  autopilot_acknowledged_at timestamptz,        -- explicit opt-in timestamp
  form_key       text not null default encode(gen_random_bytes(16), 'hex'), -- public inquiry intake key
  daily_digest   boolean not null default true,
  updated_at     timestamptz not null default now()
);

create table if not exists public.business_ops_rules (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  trigger_event  text not null check (trigger_event in ('inquiry_received','inquiry_high_priority')),
  action         text not null check (action in ('draft_reply','notify','mark_priority')),  -- SAFE actions only — no sending
  category_filter text,
  is_active      boolean not null default true,
  runs_count     int not null default 0,
  last_run_at    timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists public.business_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  report_type text not null,             -- daily | weekly | monthly | marketing | content | leads | inquiries | credits | growth
  period_start date,
  period_end  date,
  report_json jsonb not null default '{}'::jsonb,
  used_ai     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_biz_reports_user on public.business_reports(user_id, report_type, created_at desc);

create table if not exists public.business_ops_activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,             -- e.g. inquiry.auto_drafted, document.generated
  detail      text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_biz_activity_user on public.business_ops_activity(user_id, created_at desc);

-- ---- RLS: owner policies on every table -----------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'company_profiles','business_products','business_inquiries','inquiry_replies',
    'business_documents','business_knowledge','business_ops_settings',
    'business_ops_rules','business_reports','business_ops_activity'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_owner'
    ) then
      execute format(
        'create policy "%s_owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
        t, t
      );
    end if;
  end loop;
end $$;
