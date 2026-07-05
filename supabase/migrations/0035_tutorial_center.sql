-- =====================================================================
-- Demo Video & Tutorial Center.
--
-- Extends the existing tutorials table (0017) with workflow fields, adds
-- categories/assets/progress/playlists/generation-jobs tables, migrates the
-- 11 live videos into the new 7-category taxonomy, and seeds the full
-- required catalog: records that don't have a video yet are status='planned'
-- + is_published=false (users never see promises; admin generates them
-- progressively via the avatar pipeline). Idempotent.
-- =====================================================================

-- ---- tutorials: new workflow fields ----------------------------------------
alter table public.tutorials add column if not exists slug          text;
alter table public.tutorials add column if not exists transcript    text;
alter table public.tutorials add column if not exists status        text not null default 'published';
alter table public.tutorials add column if not exists target_route  text;
alter table public.tutorials add column if not exists cta_label     text;
alter table public.tutorials add column if not exists cta_url       text;
alter table public.tutorials add column if not exists version       int not null default 1;
create unique index if not exists idx_tutorials_slug on public.tutorials(slug) where slug is not null;

-- ---- categories (7, ordered) ------------------------------------------------
create table if not exists public.tutorial_categories (
  id          text primary key,          -- slug
  name        text not null,
  description text,
  sort_order  int not null default 0
);
insert into public.tutorial_categories (id, name, description, sort_order) values
  ('getting-started',      'Getting Started',        'Your first steps on the platform', 1),
  ('account-security',     'Account & Security',     'Protect and configure your account', 2),
  ('create',               'Create',                 'Content, design, build and publishing', 3),
  ('grow',                 'Grow',                   'Marketing, automation, analytics and leads', 4),
  ('manage',               'Manage',                 'Billing, credits and integrations', 5),
  ('business-operations',  'Business Operations',    'The AI Business Operations Manager', 6),
  ('admin-infrastructure', 'Admin & Infrastructure', 'For platform administrators', 7)
on conflict (id) do nothing;

alter table public.tutorial_categories enable row level security;
drop policy if exists "tutorial_categories_read" on public.tutorial_categories;
create policy "tutorial_categories_read" on public.tutorial_categories for select using (true);

-- ---- assets / playlists / jobs ----------------------------------------------
create table if not exists public.tutorial_assets (
  id          uuid primary key default gen_random_uuid(),
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  kind        text not null check (kind in ('voiceover','avatar_video','screen_recording','thumbnail','visual')),
  url         text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.tutorial_assets enable row level security; -- service-role only

create table if not exists public.tutorial_playlists (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  description    text,
  tutorial_slugs jsonb not null default '[]'::jsonb,  -- ordered slugs
  sort_order     int not null default 0
);
alter table public.tutorial_playlists enable row level security;
drop policy if exists "tutorial_playlists_read" on public.tutorial_playlists;
create policy "tutorial_playlists_read" on public.tutorial_playlists for select using (true);

create table if not exists public.tutorial_generation_jobs (
  id              uuid primary key default gen_random_uuid(),
  tutorial_id     uuid references public.tutorials(id) on delete cascade,
  kind            text not null check (kind in ('avatar_video','voiceover','thumbnail')),
  status          text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  provider_job_id text,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.tutorial_generation_jobs enable row level security; -- service-role only

-- ---- progress (per user, owner RLS) ------------------------------------------
create table if not exists public.tutorial_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  tutorial_id     uuid not null references public.tutorials(id) on delete cascade,
  watched_seconds int not null default 0,
  completed_at    timestamptz,
  updated_at      timestamptz not null default now(),
  unique (user_id, tutorial_id)
);
alter table public.tutorial_progress enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='tutorial_progress' and policyname='tutorial_progress_owner') then
    create policy tutorial_progress_owner on public.tutorial_progress
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ---- migrate the 11 existing videos into the new taxonomy + slugs -------------
update public.tutorials set category='Getting Started', slug=coalesce(slug,'platform-overview'),      target_route='/dashboard',                cta_label='Create Your First Project', cta_url='/dashboard/create'          where title like 'Meet CreatorsForge%' or title like 'Meet CreatorForge%';
update public.tutorials set category='Getting Started', slug=coalesce(slug,'full-walkthrough'),       target_route='/dashboard',                cta_label='Start Free',                cta_url='/dashboard'                 where title like 'Full walkthrough%';
update public.tutorials set category='Create',          slug=coalesce(slug,'create-ai-video'),        target_route='/dashboard/create?group=video', cta_label='Create Your First Video', cta_url='/dashboard/create?group=video' where title='Create your first AI video';
update public.tutorials set category='Create',          slug=coalesce(slug,'generate-seo-article'),   target_route='/dashboard/seo/new',        cta_label='Write an SEO Article',      cta_url='/dashboard/seo/new'         where title='Generate an SEO blog post';
update public.tutorials set category='Grow',            slug=coalesce(slug,'run-seo-audit'),          target_route='/dashboard/seo/audit',      cta_label='Run SEO Audit',             cta_url='/dashboard/seo/audit'       where title='Run an SEO audit';
update public.tutorials set category='Manage',          slug=coalesce(slug,'connect-integrations'),   target_route='/dashboard/manage/integrations', cta_label='Connect Accounts',     cta_url='/dashboard/manage/integrations' where title='Connect your accounts';
update public.tutorials set category='Manage',          slug=coalesce(slug,'topup-credits-crypto'),   target_route='/dashboard/credits',        cta_label='Top Up Credits',            cta_url='/dashboard/credits'         where title='Credits & crypto top-ups';
update public.tutorials set category='Grow',            slug=coalesce(slug,'start-autopilot'),        target_route='/dashboard/autopilot',      cta_label='Start Autopilot',           cta_url='/dashboard/autopilot'       where title='Set up Autopilot';
update public.tutorials set category='Getting Started', slug=coalesce(slug,'assistant-guided-tours'), target_route='/dashboard',                cta_label='Open Forge AI',             cta_url='/dashboard'                 where title like 'Forge AI Assistant%';
update public.tutorials set category='Getting Started', slug=coalesce(slug,'dark-mode-wrap-up'),      target_route='/dashboard/settings',       cta_label='Open Settings',             cta_url='/dashboard/settings'        where title='Dark mode & wrap-up';

-- ---- seed the remaining required catalog (planned = admin generates video) ----
insert into public.tutorials (title, slug, description, category, video_url, duration, level, sort_order, is_published, status, target_route, cta_label, cta_url)
select * from (values
  -- Getting Started
  ('Use global search',            'use-global-search',        'Find any studio, tool, template or setting with Ctrl+K.',                        'Getting Started', '', '0:30', 'beginner', 20, false, 'planned', '/dashboard',                        'Try Global Search',        '/dashboard'),
  ('Use Quick Create',             'use-quick-create',         'The global Create button: video, article, design, website, book and more.',      'Getting Started', '', '0:30', 'beginner', 21, false, 'planned', '/dashboard',                        'Open Quick Create',        '/dashboard'),
  ('Understand credits',           'understand-credits',       'What credits are, what actions cost, and how allowances renew.',                 'Getting Started', '', '0:45', 'beginner', 22, false, 'planned', '/dashboard/credits',                'View Credit Wallet',       '/dashboard/credits'),
  ('Create your first project',    'create-first-project',     'From idea to finished content in one guided flow.',                              'Getting Started', '', '0:45', 'beginner', 23, false, 'planned', '/dashboard/create',                 'Create Your First Project','/dashboard/create'),
  -- Account & Security
  ('Create your account',          'create-account',           'Sign up with email or Google and confirm your address.',                         'Account & Security', '', '0:30', 'beginner', 30, false, 'planned', '/signup',                          'Start Free',               '/signup'),
  ('Secure your account',          'secure-your-account',      'Password changes, 2FA with backup codes, and security alerts — the essentials.', 'Account & Security', '', '1:30', 'beginner', 31, false, 'draft',   '/dashboard/settings',              'Secure My Account',        '/dashboard/settings'),
  ('Change your password',         'change-password',          'Update your password safely; other devices are signed out automatically.',       'Account & Security', '', '0:30', 'beginner', 32, false, 'planned', '/dashboard/settings',              'Change Password',          '/dashboard/settings'),
  ('Enable 2FA',                   'enable-2fa',               'Protect your account with an authenticator app and backup codes.',               'Account & Security', '', '0:45', 'beginner', 33, false, 'planned', '/dashboard/settings',              'Enable 2FA',               '/dashboard/settings'),
  ('Set notification preferences', 'notification-preferences', 'Choose which alerts and summaries reach your inbox.',                            'Account & Security', '', '0:30', 'beginner', 34, false, 'planned', '/dashboard/settings',              'Open Preferences',         '/dashboard/settings'),
  -- Create
  ('Use Design Studio',            'use-design-studio',        'Graphics, brand kits, templates and AI concepts.',                               'Create', '', '0:45', 'beginner', 40, false, 'planned', '/dashboard/design',                 'Design a Graphic',         '/dashboard/design/new'),
  ('Use Build Studio',             'use-build-studio',         'Plan complete websites, apps, stores and funnels.',                              'Create', '', '0:45', 'beginner', 41, false, 'planned', '/dashboard/build',                  'Plan a Website',           '/dashboard/build/new'),
  ('Write a book',                 'write-a-book',             'AI-assisted books: chapters, covers, marketing and export.',                     'Create', '', '0:45', 'beginner', 42, false, 'planned', '/dashboard/books',                  'Start a Book',             '/dashboard/books/new'),
  ('Export your content',          'export-content',           'PNG, JPG, PDF, MP4 and prompt packages — where every export lives.',             'Create', '', '0:30', 'beginner', 43, false, 'planned', '/dashboard/design/exports',         'Open Export Center',       '/dashboard/design/exports'),
  -- Grow
  ('Create an ad campaign',        'create-ad-campaign',       'Build platform-ready ad creatives and campaigns.',                               'Grow', '', '0:45', 'beginner', 50, false, 'planned', '/dashboard/ads/create',             'Launch Ad Campaign',       '/dashboard/ads/create'),
  ('Generate leads',               'generate-leads',           'Find, verify and manage B2B leads.',                                             'Grow', '', '0:45', 'intermediate', 51, false, 'planned', '/dashboard/leads',               'Generate Leads',           '/dashboard/leads'),
  ('Use the AI Email Assistant',   'use-email-assistant',      'Connect your inbox, triage messages and approve AI drafts.',                     'Grow', '', '0:45', 'beginner', 52, false, 'planned', '/dashboard/email',                  'Connect Your Inbox',       '/dashboard/email'),
  -- Manage
  ('View and compare plans',       'view-plans',               'Starter, Professional, Business and Enterprise — side by side.',                 'Manage', '', '0:30', 'beginner', 60, false, 'planned', '/dashboard/billing/plans',          'Compare Plans',            '/dashboard/billing/plans'),
  ('Upgrade your subscription',    'upgrade-subscription',     'Move to a bigger plan with crypto checkout.',                                    'Manage', '', '0:30', 'beginner', 61, false, 'planned', '/dashboard/billing/plans',          'Upgrade Plan',             '/dashboard/billing/plans'),
  ('View invoices',                'view-invoices',            'Numbered invoices and receipts, downloadable as PDF.',                           'Manage', '', '0:30', 'beginner', 62, false, 'planned', '/dashboard/billing/invoices',       'View Invoices',            '/dashboard/billing/invoices'),
  -- Business Operations
  ('Set up your company profile',  'setup-company-profile',    'Teach the AI your business — it powers every reply and document.',               'Business Operations', '', '0:45', 'beginner', 70, false, 'planned', '/dashboard/business/profile',    'Build My Profile',         '/dashboard/business/profile'),
  ('AI Business Operations Manager','business-ops-overview',   'The executive dashboard, health score and automation modes.',                    'Business Operations', '', '1:30', 'beginner', 71, false, 'planned', '/dashboard/business',            'Open Business Manager',    '/dashboard/business'),
  ('Manage inquiries',             'manage-inquiries',         'Website inquiries, AI triage and priorities.',                                   'Business Operations', '', '0:45', 'beginner', 72, false, 'planned', '/dashboard/business/inquiries',  'Open Inquiry Center',      '/dashboard/business/inquiries'),
  ('Draft professional replies',   'draft-replies',            'AI drafts from your knowledge base — you approve and send.',                     'Business Operations', '', '0:45', 'beginner', 73, false, 'planned', '/dashboard/business/inquiries',  'Draft a Reply',            '/dashboard/business/inquiries'),
  ('Generate business reports',    'generate-business-reports','Weekly and monthly reports from your real metrics.',                             'Business Operations', '', '0:30', 'beginner', 74, false, 'planned', '/dashboard/business/reports',    'Generate a Report',        '/dashboard/business/reports'),
  -- Admin & Infrastructure
  ('Operations Review Center',     'admin-operations-review',  'Renewals, keys, balances and alerts for administrators.',                        'Admin & Infrastructure', '', '0:45', 'advanced', 80, false, 'planned', '/admin/operations',            'Open Operations Review',   '/admin/operations'),
  ('API key rotation',             'admin-key-rotation',       'Track rotation schedules and keep provider keys fresh.',                         'Admin & Infrastructure', '', '0:30', 'advanced', 81, false, 'planned', '/admin/operations/api-keys',   'Review API Keys',          '/admin/operations/api-keys'),
  ('Subscription renewals',        'admin-renewals',           'The renewal calendar with escalating urgency.',                                  'Admin & Infrastructure', '', '0:30', 'advanced', 82, false, 'planned', '/admin/infra/renewals',        'Open Renewal Center',      '/admin/infra/renewals'),
  ('Credit provider monitoring',   'admin-credit-monitoring',  'Provider balances, runway and top-up tracking.',                                 'Admin & Infrastructure', '', '0:30', 'advanced', 83, false, 'planned', '/admin/operations/credits',    'Monitor Balances',         '/admin/operations/credits'),
  ('Infrastructure alerts',        'admin-infra-alerts',       'Alert rules, dedupe and critical email notifications.',                          'Admin & Infrastructure', '', '0:30', 'advanced', 84, false, 'planned', '/admin/operations/alerts',     'Review Alerts',            '/admin/operations/alerts')
) as v(title, slug, description, category, video_url, duration, level, sort_order, is_published, status, target_route, cta_label, cta_url)
where not exists (select 1 from public.tutorials t where t.slug = v.slug);

-- ---- the required security tutorial ships with its full script ----------------
update public.tutorials set transcript =
'Welcome to CreatorsForge. In ninety seconds you''ll have your account properly protected.
WHAT THIS COVERS: password changes, two-factor authentication, backup codes, and security alerts.
WHEN TO USE IT: right now — before your account holds work you care about.
STEP 1 — Password. Open Settings, find Change Password, and set a strong unique password. We''ll email you a confirmation and sign out your other devices automatically. Forgot it? The login page has a reset link that emails you a secure recovery flow.
STEP 2 — Two-factor authentication. In Settings, Security, click Enable 2FA. Scan the QR code with Google Authenticator, Microsoft Authenticator, Authy or 1Password, and enter the six-digit code. From then on, logging in takes your password plus a code from your phone — even a stolen password can''t get in.
STEP 3 — Backup codes. When 2FA activates you get ten one-time backup codes. Download the file and keep it somewhere safe. If you ever lose your phone, a backup code is your way back in — each works exactly once.
STEP 4 — Alerts. Security events — password changes, failed 2FA attempts, new backup codes — trigger automatic email alerts, so you''ll know immediately if something happens that wasn''t you.
BILLING NOTE: everything in this tutorial is free — security never costs credits.
FINAL ACTION: click Secure My Account below and enable 2FA now. It takes two minutes and it''s the single best thing you can do for your account.'
where slug = 'secure-your-account' and (transcript is null or transcript = '');

-- ---- default playlist: new-user onboarding -----------------------------------
insert into public.tutorial_playlists (slug, title, description, tutorial_slugs, sort_order)
select 'new-user-onboarding', 'New User Onboarding',
       'Watch these in order — from first login to your first published content.',
       '["platform-overview","secure-your-account","create-ai-video","understand-credits","use-quick-create"]'::jsonb, 1
where not exists (select 1 from public.tutorial_playlists where slug = 'new-user-onboarding');
