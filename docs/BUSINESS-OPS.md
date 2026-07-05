# AI Business Operations Manager (Business Studio flagship)

`/dashboard/business` — a complete AI business assistant: organize company
information, manage catalogues and inquiries, draft replies and documents,
monitor health, and alert the owner whenever human attention is required.

**The safety contract:** the AI prepares, the human approves. Replies are NEVER
sent automatically — the platform doesn't even have a send channel for them
("Copy & mark sent" hands the approved text to the owner's own email/chat).
Autopilot mode requires an explicit acknowledgement (stamped in
`business_ops_settings.autopilot_acknowledged_at`) and, per config
`AUTOPILOT_FORBIDDEN`, may never negotiate pricing, approve refunds, accept
contracts, touch legal/disputes/billing, delete data, or send customer replies.

## Pages (10, sub-nav in BUSINESS_NAV)

Executive Dashboard (health + counts + approvals + activity audit) · Company
Profile (18 fields + deterministic Optimization Score + AI analysis) · Product
Catalogue (CRUD + AI marketing pack: SEO desc/copy/captions/FAQ/differentiators
/image+video prompts w/ hand-offs to Design & Video studios) · Marketing Center
(campaign workflow Create→Review→Approve→Schedule→Publish→Analyse; links to
Ads/Autopilot/Calendar/Queue — no duplication of existing modules) · Inquiry
Center (manual + public form intake; AI batch triage; sensitive flags; draft
replies approve/edit/reject) · Documents (10 types; quotation/invoice/PO
numbered `BD-YYYY-NNNN` per user; print/Save-as-PDF) · Knowledge Base (9 kinds,
text entries injected into every generator, 20k chars each, activate/deactivate)
· Reports (7 types; REAL metrics + AI narrative) · Health Score (0-100
deterministic, 8 explainable factors) · Settings (3 automation modes + form key
+ digest).

## Data & AI

Migration 0034: company_profiles, business_products, business_inquiries,
inquiry_replies, business_documents, business_knowledge, business_ops_settings,
business_ops_rules (safe actions only), business_reports, business_ops_activity
(audit trail) — owner RLS everywhere.

`lib/business/`: profile.ts (pure completeness/quality scorer),
health.ts (pure computeHealth + collector), ai.ts (Claude+placeholder:
optimizeProfile, generateProductPack, triageInquiries BATCHED, draftInquiryReply,
generateDocument, narrateReport — every prompt carries `buildCompanyContext` =
profile + active knowledge, capped 9k chars; AI can only ADD inquiry
sensitivity, never remove the keyword flag), reports.ts (metrics collector +
doc numbering + activity log).

## Credits (charged only on real-AI success)

profileOptimize 5 · productPack 8 · inquiryTriage 5/25 batch · inquiryDraft 2 ·
documentGenerate 5 · businessReport 10. Costs shown on every button.

## Public inquiry intake

`POST /api/business/inquiries/intake { key, name, email, subject, message }` —
the per-user 32-hex `form_key` (Business Settings, copyable snippet) scopes the
inquiry; rate-limited 10/10min/IP, size-capped, sensitive-keyword pre-flagged,
in-app bell notification on arrival. The key identifies the account only and
reads nothing.

## Admin

`/admin/business` + `/api/admin/business`: aggregate counts + automation
activity feed — customer content is never exposed to admins.

## Known limitations

- Reply sending is deliberately manual (copy & mark sent) — no SMTP/channel
  integration for customer replies yet; the Email Assistant covers OAuth inboxes.
- Knowledge Base accepts pasted text only (no PDF parsing yet).
- business_ops_rules table is provisioned; the rule executor ships with the
  next cron iteration — the UI doesn't promise automation it can't do.
- CRM shows as "Coming soon" in navigation.
