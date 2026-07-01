-- =====================================================================
-- 0026 — Indexes, foreign keys & check constraints (production audit).
--
-- PURPOSE
-- -------
-- This migration is purely ADDITIVE and is safe to run on a LIVE database
-- that already holds data. It does three things:
--
--   1. Adds covering indexes on unindexed foreign-key / hot-filter columns
--      using `CREATE INDEX IF NOT EXISTS`. Index creation never rejects a
--      row, and IF NOT EXISTS makes every statement idempotent.
--
--   2. Adds a handful of missing foreign keys that today are stored as bare
--      uuid columns. Each is added as `NOT VALID`, which means Postgres
--      enforces the FK for NEW / changed rows only and does NOT scan the
--      existing table — so no legacy row can cause this migration to fail.
--
--   3. Adds a few CHECK constraints (money >= 0, a documented status enum)
--      also as `NOT VALID`, for the same reason: existing rows are not
--      checked, so the migration cannot be rejected by pre-existing data.
--
-- Every FK / CHECK is wrapped in an idempotency guard (pg_constraint lookup)
-- and a table-existence guard (to_regclass), so the whole file is safe to
-- re-run and safe on installs where a given table may not exist.
--
-- ENFORCING ON OLD ROWS LATER (optional, admin-run)
-- -------------------------------------------------
-- The NOT VALID constraints above are already enforced going forward. To
-- also enforce them against pre-existing rows, an admin can run — during a
-- low-traffic window, after confirming the old data is clean — e.g.:
--
--     ALTER TABLE public.book_campaigns VALIDATE CONSTRAINT fk_book_campaigns_ad_campaign;
--
-- VALIDATE takes only a SHARE UPDATE EXCLUSIVE lock (does not block reads or
-- writes) but does scan the table, so it is intentionally left out of this
-- migration. Run it per-constraint when convenient.
-- =====================================================================


-- =====================================================================
-- 1. COVERING INDEXES  (always safe / idempotent)
-- =====================================================================

-- ---- 0003 media cascade FKs ----------------------------------------
create index if not exists idx_voiceovers_scene    on public.voiceovers(scene_id);
create index if not exists idx_voiceovers_asset     on public.voiceovers(asset_id);
create index if not exists idx_thumbnails_asset      on public.thumbnails(asset_id);
create index if not exists idx_subtitles_asset       on public.subtitles(asset_id);
create index if not exists idx_scene_assets_asset    on public.scene_assets(asset_id);
create index if not exists idx_media_library_asset   on public.media_library(asset_id);

-- ---- analytics_events / billing_events hot filters (schema.sql + 0006/0007) ----
create index if not exists idx_analytics_workspace on public.analytics_events(workspace_id);
create index if not exists idx_analytics_project    on public.analytics_events(project_id);
create index if not exists idx_billing_status       on public.billing_events(status);
create index if not exists idx_billing_created       on public.billing_events(created_at);

-- ---- 0006 publishing FKs without an index --------------------------
create index if not exists idx_pubjobs_workspace     on public.publish_jobs(workspace_id);
create index if not exists idx_pubjobs_asset          on public.publish_jobs(asset_id);
create index if not exists idx_sched_social_account   on public.scheduled_posts(social_account_id);
create index if not exists idx_pubhist_scheduled      on public.publish_history(scheduled_post_id);
create index if not exists idx_automation_workspace   on public.automation_rules(workspace_id);

-- ---- 0009 SEO studio FKs without an index --------------------------
create index if not exists idx_seo_articles_project  on public.seo_articles(project_id);
create index if not exists idx_seo_articles_wpsite    on public.seo_articles(wordpress_site_id);
create index if not exists idx_wp_history_wpsite       on public.wordpress_publish_history(wordpress_site_id);

-- ---- 0012 assistant FKs without an index ---------------------------
create index if not exists idx_assistant_feedback_msg  on public.assistant_feedback(message_id);
create index if not exists idx_assistant_feedback_conv on public.assistant_feedback(conversation_id);

-- ---- 0019 advertising FKs without an index -------------------------
create index if not exists idx_ad_assets_campaign        on public.ad_assets(campaign_id);
create index if not exists idx_campaign_history_campaign on public.campaign_history(campaign_id);

-- ---- 0020 publishing (books) FKs without an index ------------------
create index if not exists idx_book_illustrations_chapter on public.book_illustrations(chapter_id);
create index if not exists idx_book_campaigns_book         on public.book_campaigns(book_id);
create index if not exists idx_book_campaigns_ad           on public.book_campaigns(ad_campaign_id);

-- ---- 0024 lead generator FKs without an index ----------------------
create index if not exists idx_lead_compliance_lead     on public.lead_compliance_logs(lead_id);
create index if not exists idx_lead_compliance_campaign on public.lead_compliance_logs(campaign_id);

-- ---- 0025 lead premium FKs without an index ------------------------
create index if not exists idx_lead_send_approvals_ecamp on public.lead_send_approvals(email_campaign_id);
create index if not exists idx_lead_send_approvals_list  on public.lead_send_approvals(list_id);
create index if not exists idx_lead_safety_checks_ecamp  on public.lead_safety_checks(email_campaign_id);


-- =====================================================================
-- 2. MISSING FOREIGN KEYS  (added NOT VALID — existing rows not scanned)
--
-- All target columns below are nullable, so ON DELETE SET NULL is used.
-- =====================================================================

-- book_campaigns.ad_campaign_id -> ad_campaigns(id)   [0020 -> 0019]
do $$ begin
  if to_regclass('public.book_campaigns') is not null
     and to_regclass('public.ad_campaigns') is not null
     and not exists (select 1 from pg_constraint where conname = 'fk_book_campaigns_ad_campaign') then
    alter table public.book_campaigns add constraint fk_book_campaigns_ad_campaign
      foreign key (ad_campaign_id) references public.ad_campaigns(id) on delete set null not valid;
  end if;
end $$;

-- lead_compliance_logs.lead_id -> leads(id)           [0024]
do $$ begin
  if to_regclass('public.lead_compliance_logs') is not null
     and to_regclass('public.leads') is not null
     and not exists (select 1 from pg_constraint where conname = 'fk_lead_compliance_lead') then
    alter table public.lead_compliance_logs add constraint fk_lead_compliance_lead
      foreign key (lead_id) references public.leads(id) on delete set null not valid;
  end if;
end $$;

-- lead_compliance_logs.campaign_id -> lead_campaigns(id)  [0024]
do $$ begin
  if to_regclass('public.lead_compliance_logs') is not null
     and to_regclass('public.lead_campaigns') is not null
     and not exists (select 1 from pg_constraint where conname = 'fk_lead_compliance_campaign') then
    alter table public.lead_compliance_logs add constraint fk_lead_compliance_campaign
      foreign key (campaign_id) references public.lead_campaigns(id) on delete set null not valid;
  end if;
end $$;

-- lead_send_approvals.email_campaign_id -> lead_email_campaigns(id)  [0025 -> 0024]
do $$ begin
  if to_regclass('public.lead_send_approvals') is not null
     and to_regclass('public.lead_email_campaigns') is not null
     and not exists (select 1 from pg_constraint where conname = 'fk_lead_send_approvals_ecamp') then
    alter table public.lead_send_approvals add constraint fk_lead_send_approvals_ecamp
      foreign key (email_campaign_id) references public.lead_email_campaigns(id) on delete set null not valid;
  end if;
end $$;

-- lead_send_approvals.list_id -> lead_lists(id)       [0025 -> 0024]
do $$ begin
  if to_regclass('public.lead_send_approvals') is not null
     and to_regclass('public.lead_lists') is not null
     and not exists (select 1 from pg_constraint where conname = 'fk_lead_send_approvals_list') then
    alter table public.lead_send_approvals add constraint fk_lead_send_approvals_list
      foreign key (list_id) references public.lead_lists(id) on delete set null not valid;
  end if;
end $$;

-- lead_safety_checks.email_campaign_id -> lead_email_campaigns(id)  [0025 -> 0024]
do $$ begin
  if to_regclass('public.lead_safety_checks') is not null
     and to_regclass('public.lead_email_campaigns') is not null
     and not exists (select 1 from pg_constraint where conname = 'fk_lead_safety_checks_ecamp') then
    alter table public.lead_safety_checks add constraint fk_lead_safety_checks_ecamp
      foreign key (email_campaign_id) references public.lead_email_campaigns(id) on delete set null not valid;
  end if;
end $$;


-- =====================================================================
-- 3. CHECK CONSTRAINTS  (added NOT VALID — existing rows not scanned)
-- =====================================================================

-- ---- money / rate sanity: value must be non-negative -----------------

-- billing_events.amount >= 0                          [schema.sql / 0007]
do $$ begin
  if to_regclass('public.billing_events') is not null
     and not exists (select 1 from pg_constraint where conname = 'chk_billing_events_amount_nonneg') then
    alter table public.billing_events add constraint chk_billing_events_amount_nonneg
      check (amount >= 0) not valid;
  end if;
end $$;

-- affiliate_accounts.commission_rate between 0 and 1  [schema.sql / 0007]
do $$ begin
  if to_regclass('public.affiliate_accounts') is not null
     and not exists (select 1 from pg_constraint where conname = 'chk_affiliate_commission_rate') then
    alter table public.affiliate_accounts add constraint chk_affiliate_commission_rate
      check (commission_rate >= 0 and commission_rate <= 1) not valid;
  end if;
end $$;

-- referral_rewards.amount >= 0                        [schema.sql / 0007]
do $$ begin
  if to_regclass('public.referral_rewards') is not null
     and not exists (select 1 from pg_constraint where conname = 'chk_referral_rewards_amount_nonneg') then
    alter table public.referral_rewards add constraint chk_referral_rewards_amount_nonneg
      check (amount >= 0) not valid;
  end if;
end $$;

-- credit_purchases money columns >= 0                 [0010]
do $$ begin
  if to_regclass('public.credit_purchases') is not null
     and not exists (select 1 from pg_constraint where conname = 'chk_credit_purchases_money_nonneg') then
    alter table public.credit_purchases add constraint chk_credit_purchases_money_nonneg
      check (usd_amount >= 0 and processing_fee >= 0 and credits >= 0) not valid;
  end if;
end $$;

-- ---- status enum: only for tables with a fully documented allowed set ----

-- subscriptions.status: active | canceled | past_due  [schema.sql, line 79]
do $$ begin
  if to_regclass('public.subscriptions') is not null
     and not exists (select 1 from pg_constraint where conname = 'chk_subscriptions_status') then
    alter table public.subscriptions add constraint chk_subscriptions_status
      check (status in ('active','canceled','past_due')) not valid;
  end if;
end $$;
