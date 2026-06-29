-- =====================================================================
-- SEO Content Studio + multi-site WordPress publishing. Idempotent.
-- (Keyword/outline/faq/image data live as JSON columns on seo_articles to
--  avoid over-normalization; the spec's child tables map to those columns.)
-- =====================================================================

create table if not exists public.seo_projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'SEO Project',
  created_at  timestamptz not null default now()
);
create index if not exists idx_seo_projects_user on public.seo_projects(user_id);

create table if not exists public.wordpress_sites (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid not null references auth.users(id) on delete cascade,
  site_name                     text not null,
  site_url                      text not null,
  username                      text not null,
  encrypted_application_password text not null,   -- AES-256-GCM (never raw)
  default_category              text,
  default_author                text,
  connection_status             text not null default 'connected',  -- connected | error
  last_connection_test          timestamptz,
  metadata                      jsonb not null default '{}'::jsonb,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (user_id, site_url)
);
create index if not exists idx_wp_sites_user on public.wordpress_sites(user_id);

create table if not exists public.seo_articles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  project_id          uuid references public.seo_projects(id) on delete set null,
  wordpress_site_id   uuid references public.wordpress_sites(id) on delete set null,
  main_keyword        text,
  secondary_keywords  text[] not null default '{}',
  target_country      text,
  target_audience     text,
  search_intent       text,
  article_type        text,
  tone                text,
  word_count          integer,
  language            text default 'en',
  seo_title           text,
  meta_title          text,
  meta_description    text,
  slug                text,
  h1                  text,
  outline_json        jsonb not null default '[]'::jsonb,
  article_content     text,
  faq_json            jsonb not null default '[]'::jsonb,
  schema_recommendation text,
  image_prompts_json  jsonb not null default '[]'::jsonb,
  featured_image_prompt text,
  alt_text_json       jsonb not null default '[]'::jsonb,
  excerpt             text,
  tags                text[] not null default '{}',
  category            text,
  internal_links      jsonb not null default '[]'::jsonb,
  external_links      jsonb not null default '[]'::jsonb,
  cta                 text,
  social_captions     jsonb not null default '[]'::jsonb,
  newsletter_summary  text,
  seo_score           integer,
  readability_score   integer,
  status              text not null default 'draft',  -- draft | scheduled | publishing | published | failed
  scheduled_at        timestamptz,
  published_at        timestamptz,
  wordpress_post_id   text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_seo_articles_user on public.seo_articles(user_id);
create index if not exists idx_seo_articles_status on public.seo_articles(status);
create index if not exists idx_seo_articles_sched on public.seo_articles(scheduled_at);

create table if not exists public.wordpress_publish_history (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  article_id        uuid references public.seo_articles(id) on delete cascade,
  wordpress_site_id uuid references public.wordpress_sites(id) on delete set null,
  status            text not null,            -- published | scheduled | failed
  wordpress_post_id text,
  post_url          text,
  error             text,
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists idx_wp_history_user on public.wordpress_publish_history(user_id);
create index if not exists idx_wp_history_article on public.wordpress_publish_history(article_id);

-- RLS — owner-only on every table.
alter table public.seo_projects              enable row level security;
alter table public.wordpress_sites           enable row level security;
alter table public.seo_articles              enable row level security;
alter table public.wordpress_publish_history enable row level security;

do $$
declare t text;
begin
  foreach t in array array['seo_projects','wordpress_sites','seo_articles','wordpress_publish_history']
  loop
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t, t
    );
  end loop;
end $$;
