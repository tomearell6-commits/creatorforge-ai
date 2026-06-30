-- =====================================================================
-- AI Advertising Studio.
--
-- Campaign management workspace: campaigns, AI creatives, assets, connected ad
-- accounts, reports, variations, audiences, history, templates. Owner-only RLS;
-- ad-account tokens stored encrypted (via the app's secrets layer), connected
-- through each platform's official OAuth. Idempotent: safe to re-run.
-- =====================================================================

create table if not exists public.ad_campaigns (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  business     text, website text, industry text, country text, language text default 'en',
  objective    text not null default 'traffic',   -- awareness|traffic|sales|leads|app|video_views|engagement
  platforms    jsonb not null default '[]'::jsonb, -- ["facebook","google",...]
  creative_types jsonb not null default '[]'::jsonb,
  audience     jsonb not null default '{}'::jsonb,
  status       text not null default 'draft',      -- draft|scheduled|publishing|running|paused|completed|failed
  scheduled_at timestamptz,
  credits_used integer not null default 0,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_ad_campaigns_user on public.ad_campaigns(user_id, created_at desc);
create index if not exists idx_ad_campaigns_status on public.ad_campaigns(status);

create table if not exists public.ad_creatives (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid references public.ad_campaigns(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  headline      text, primary_text text, description text, cta text,
  hashtags      jsonb not null default '[]'::jsonb,
  image_prompt  text, video_prompt text,
  image_url     text, video_url text,
  variant_label text,                               -- e.g. "A", "B"
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_ad_creatives_campaign on public.ad_creatives(campaign_id);
create index if not exists idx_ad_creatives_user on public.ad_creatives(user_id, created_at desc);

create table if not exists public.ad_assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.ad_campaigns(id) on delete set null,
  kind        text not null,                        -- image|video|copy
  title       text, url text, body text,
  tags        jsonb not null default '[]'::jsonb,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_ad_assets_user on public.ad_assets(user_id, created_at desc);

create table if not exists public.connected_ad_accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  platform       text not null,                     -- facebook|instagram|google|youtube|linkedin|pinterest|tiktok
  account_name   text,
  external_id    text,
  encrypted_token text,                             -- OAuth token, encrypted at rest
  permission_status text default 'unknown',
  connection_status text not null default 'connected',
  last_sync_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, platform)
);
create index if not exists idx_connected_ad_accounts_user on public.connected_ad_accounts(user_id);

create table if not exists public.campaign_reports (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid references public.ad_campaigns(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  platform      text,
  clicks integer, impressions integer, reach integer,
  spend numeric(12,2), conversions integer,
  ctr numeric(6,3), cpc numeric(12,4), cpa numeric(12,4), roas numeric(8,2),
  reported_at   timestamptz not null default now()
);
create index if not exists idx_campaign_reports_campaign on public.campaign_reports(campaign_id);

create table if not exists public.campaign_variations (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.ad_campaigns(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text, headline text, primary_text text, cta text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_campaign_variations_campaign on public.campaign_variations(campaign_id);

create table if not exists public.campaign_audiences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  country text, age_min integer, age_max integer, gender text,
  languages   jsonb not null default '[]'::jsonb,
  interests   jsonb not null default '[]'::jsonb,
  audience_type text default 'interest',            -- interest|custom|lookalike
  created_at  timestamptz not null default now()
);
create index if not exists idx_campaign_audiences_user on public.campaign_audiences(user_id);

create table if not exists public.campaign_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.ad_campaigns(id) on delete set null,
  action      text not null,                        -- created|generated|scheduled|published|paused|duplicated|failed
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_campaign_history_user on public.campaign_history(user_id, created_at desc);

create table if not exists public.campaign_templates (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,                        -- industry name
  objective   text not null,
  suggested_copy text,
  creative_ideas jsonb not null default '[]'::jsonb,
  recommended_formats jsonb not null default '[]'::jsonb,
  suggested_cta text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- RLS — owner-only on user tables; templates world-readable.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'ad_campaigns','ad_creatives','ad_assets','connected_ad_accounts','campaign_reports',
    'campaign_variations','campaign_audiences','campaign_history'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format('create policy "%s_owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t, t);
  end loop;
end $$;

alter table public.campaign_templates enable row level security;
drop policy if exists "campaign_templates_read" on public.campaign_templates;
create policy "campaign_templates_read" on public.campaign_templates for select using (true);

-- =====================================================================
-- Seed 12 industry starter templates (idempotent on slug).
-- =====================================================================
insert into public.campaign_templates (slug, name, objective, suggested_copy, creative_ideas, recommended_formats, suggested_cta, sort_order) values
  ('ecommerce','Ecommerce','sales','Showcase your best-selling product with a clear offer and urgency.','["Product hero shot","Before/after","UGC unboxing"]','["image","carousel","short_video"]','Shop Now',1),
  ('saas','SaaS','leads','Lead with the problem you solve and a free trial.','["Dashboard demo","Feature highlight","Customer quote"]','["video","image","lead_form"]','Start Free Trial',2),
  ('real_estate','Real Estate','leads','Highlight the listing''s standout features and location.','["Property walkthrough","Neighborhood shots","Agent intro"]','["carousel","video","lead_form"]','Book a Viewing',3),
  ('restaurants','Restaurants','traffic','Make the food the star; add a limited-time offer.','["Dish close-ups","Ambience reel","Chef intro"]','["image","short_video","story"]','Order Now',4),
  ('healthcare','Healthcare','leads','Build trust with credentials and clear, caring language.','["Clinic tour","Staff intro","Patient testimonial"]','["video","image","lead_form"]','Book Appointment',5),
  ('education','Education','leads','Sell the outcome and the transformation.','["Course preview","Student results","Instructor intro"]','["video","carousel","lead_form"]','Enroll Today',6),
  ('fashion','Fashion','sales','Lead with style and the look; drive to the collection.','["Lookbook","Model reel","Flat-lay"]','["carousel","short_video","collection"]','Shop the Look',7),
  ('beauty','Beauty','sales','Show the result; use UGC and before/after.','["Before/after","Application demo","UGC review"]','["short_video","image","collection"]','Shop Now',8),
  ('travel','Travel','awareness','Sell the feeling and the destination.','["Destination reel","Itinerary teaser","Guest moments"]','["video","carousel","story"]','Plan Your Trip',9),
  ('fitness','Fitness','leads','Promise a clear result and a simple first step.','["Transformation","Workout reel","Coach intro"]','["short_video","image","lead_form"]','Start Now',10),
  ('events','Events','engagement','Create urgency around the date and lineup.','["Highlight reel","Speaker/lineup","Countdown"]','["video","story","image"]','Get Tickets',11),
  ('local_business','Local Business','traffic','Emphasize locality, reviews, and a clear offer.','["Storefront","Team intro","Customer reviews"]','["image","short_video","carousel"]','Visit Us',12)
on conflict (slug) do nothing;
