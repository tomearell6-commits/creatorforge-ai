# Lead Generator

B2B lead generation for the Business Studio. The Lead Generator finds
**publicly-available business contact data**, verifies email deliverability, and
runs compliant cold-outreach campaigns — all with provenance tracking and
compliance logging on every step.

> **Public data only.** The system never scrapes behind logins, never bypasses
> CAPTCHAs, and only collects business contact details that are already publicly
> listed on the pages the user chooses to scan. Every lead stores the exact
> source URL it came from.

---

## Overview

The Lead Generator lets a user:

1. Create a **campaign** targeting a business type / location / keywords with a
   set of approved public source URLs.
2. **Run** the campaign to scan those URLs, extract public business data, dedup,
   and (optionally) verify emails.
3. **Review** the resulting leads before any outreach.
4. **Sync** eligible leads to Brevo and send a compliant outreach **campaign**.
5. **Track** opens, clicks, bounces, and unsubscribes.

## Pages (Business Studio → Lead Generator)

- **Campaigns** — create and run lead-scan campaigns; see leads found, credits
  used, and status (`draft | running | completed | failed`).
- **Leads** — review discovered leads, their source URL, verification status,
  and email quality score. Suppress / mark do-not-contact here.
- **Lists & Templates** — organize leads into lists and author outreach email
  templates (subject, body, CTA, signature).
- **Outreach** — sync a list to Brevo, create an email campaign, send, and see
  deliverability stats.
- **Admin → Lead Generator** — platform-wide analytics (provider usage, credit
  consumption, compliance activity). Admin-gated, see below.

## The pipeline

```
create campaign
   → run:
       Firecrawl scan (honors robots.txt)
       → extract public business data (emails, phone, socials, address)
       → store source URL (provenance on every lead)
       → dedup (within batch + against the user's existing leads)
       → NeverBounce verify (optional; valid/catchall = outreach-eligible)
   → review (mandatory before any outreach)
   → Brevo sync (suppressed leads pre-filtered out)
   → email campaign → send (unsubscribe footer enforced)
   → track (opens / clicks / bounces / unsubscribes → suppression)
```

The run pipeline lives in `src/app/api/leads/campaigns/run/route.ts`. It charges
credits **only** when a real provider actually runs (placeholder providers are
free), and stops gracefully asking the user to top up if credits run out
mid-run.

## Provider services

All three live under `src/lib/leads/`. Each calls the real API when its key is
set, and otherwise returns **safe, deterministic placeholder data** so the whole
flow is testable for free (placeholder emails use non-routable `example.com`
addresses and cost no credits).

| Service | File | Real when set | Purpose |
| --- | --- | --- | --- |
| Firecrawl | `lib/leads/firecrawl.ts` | `FIRECRAWL_API_KEY` | Scan public source URLs, extract public business data (robots-respecting). |
| NeverBounce | `lib/leads/neverbounce.ts` | `NEVERBOUNCE_API_KEY` | Verify email deliverability; compute quality score. |
| Brevo | `lib/leads/brevo.ts` | `BREVO_API_KEY` | Contact lists, contacts, email campaigns, send, and stats. |

Toggles: `willUseFirecrawl()`, `willUseNeverBounce()`, `willUseBrevo()`. None of
these services throw, and the Brevo key is never logged.

## Credit costs

From `LEAD_CREDIT_COSTS` (`src/lib/leads/constants.ts`) — charged only when a
real provider runs:

| Action | Credits |
| --- | --- |
| Page scan | 1 (per page crawled) |
| Extraction | 0 (bundled into the page scan) |
| Contact discovery | 1 (per contact page fetched) |
| Email verify | 1 (per email) |
| Brevo sync | 1 per 25 contacts synced |
| Campaign send | 1 per 20 emails sent |
| Campaign create | 2 |

## Compliance safeguards

- **Public data only.** Only publicly-listed business contact info is collected.
- **Provenance on every lead.** The source URL is stored on `leads.source_url`
  and in `lead_sources` (via `storeLeadSource`).
- **SSRF / private-IP blocking.** Source URLs pass `validateAuditUrl`
  (`safeSourceUrl` in `lib/leads/compliance.ts`), which rejects non-http(s)
  targets and private / non-public IP ranges. Blocked URLs are logged as
  `blocked_url`.
- **Robots respected.** Firecrawl honors `robots.txt`; disallowed pages are
  skipped and logged as `skip_robots`.
- **No CAPTCHA / login bypass.** The scanner never authenticates or solves
  challenges.
- **Mandatory unsubscribe footer.** `withUnsubscribeFooter` guarantees every
  outreach email carries the `UNSUBSCRIBE_FOOTER`.
- **Suppression before send.** `canContact` filters out do-not-contact,
  unsubscribed, bounced, and invalid/ineligible leads before any send
  (`SUPPRESSED_STATUSES`; only `valid`/`catchall` are `OUTREACH_ELIGIBLE`).
  Suppressions are logged as `suppress_dnc`, `suppress_unsub`,
  `suppress_invalid`.
- **Review before outreach.** Leads must be reviewed before a campaign can send.
- **Compliance logging.** Every outreach-relevant action (`scan`, `skip_robots`,
  `extract`, `verify`, `sync`, `send`, `blocked_url`, and the `suppress_*`
  actions) is written to `lead_compliance_logs` via `logCompliance`.

## Database

Migration `supabase/migrations/0024_lead_generator.sql` — **10 tables**, all with
owner-only RLS (`auth.uid() = user_id`):

- `lead_campaigns` — scan campaigns (status, leads_found, credits_used).
- `leads` — discovered leads (with `source_url` provenance + dedup unique index
  on `(user_id, lower(email))`).
- `lead_lists` / `lead_list_members` — list organization.
- `lead_sources` — per-lead source-URL provenance records.
- `lead_verifications` — NeverBounce verification results.
- `lead_outreach_templates` — email templates.
- `lead_email_campaigns` — outreach campaigns + deliverability counters (sent,
  opened, clicked, bounced, unsubscribed).
- `lead_email_events` — per-recipient email events.
- `lead_compliance_logs` — audit trail of every compliance-relevant action.

## API routes

User routes (owner-scoped, authenticated, rate-limited):

- `POST /api/leads/campaigns/create` — create a campaign.
- `POST /api/leads/campaigns/run` — run the scan/verify pipeline (8/hour limit).
- `GET  /api/leads/campaigns/status` — campaign status + counts.
- `GET  /api/leads/list` — list leads.
- `POST /api/leads/verify` — verify lead emails.
- `GET  /api/leads/export` — export leads.

Admin route (admin-gated):

- `GET /api/admin/leads/analytics` — platform-wide usage, credits, compliance,
  and deliverability stats + recent compliance log.

## Security

- **Owner-only RLS** on all 10 tables — a user only ever sees their own data.
- **Admin-gated analytics** — `/api/admin/leads/analytics` uses `requireAdmin`
  and a service-role client; the admin view is aggregate/platform-wide only.
- **Rate limiting** — the run pipeline is capped (8 runs/hour/user) via
  `limitRequestAsync`.
- **No key exposure** — provider keys are read server-side only and never
  returned to the client or logged.

## Future improvements

- Real Brevo webhook ingestion for bounce/unsubscribe → automatic suppression.
- Directory/search-based lead discovery (beyond user-supplied URLs).
- Per-campaign scheduling and recurring scans.
- AI-assisted outreach copy tuned per lead/business type.
- CRM export connectors (HubSpot, Pipedrive, CSV round-trip).
- Bulk NeverBounce jobs for large lists.
