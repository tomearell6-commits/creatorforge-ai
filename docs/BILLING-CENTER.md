# Subscription & Billing Center

One place for plans, credits, invoices, usage and payments: **Dashboard →
Subscription & Billing** (`/dashboard/billing`). Admin management lives at
**Admin Portal → Billing & Plans** (`/admin/billing`).

## Plan tiers

IDs are stable (webhooks, `profiles.plan`, `planCredits()` depend on them);
display names follow the Billing Center tiers:

| id | Name | Monthly | Annual | Credits |
| --- | --- | --- | --- | --- |
| free | Free Trial | $0 | — | 50 (trial) |
| creator | Starter | $19 | $190 | 500 |
| pro | Professional | $49 | $490 | 2,000 |
| agency | Business | $149 | $1,490 | 8,000 |
| enterprise | Enterprise | Custom | — | Custom (Contact Sales) |

The static catalog is `PLANS` (lib/constants); `subscription_plans` (migration
0033) lets admins reprice/rename/badge/disable live — `/api/billing/plans`
merges DB rows over the static base. The comparison matrix (22 rows ×
5 plans) is `COMPARISON_ROWS` in `src/config/billing.ts`.

## Pages

Overview (cards, usage bar, warnings, recommendations) · Plans (cards +
comparison table + confirm-before-checkout) · Credits (wallet summary +
estimated days remaining) · Usage (daily/weekly/monthly CSS bar charts +
by-category) · Invoices (search/filter + printable PDF) · History (all billing
events) · Payment Methods (2FA-gated preferences) · Support (FAQ + links).

## Data flow

- **Purchases** stay on the existing rails: crypto checkout → NOWPayments IPN
  webhook → wallet credit. The webhooks now ALSO write `invoice_records`
  (numbered `CF-YYYY-NNNNNN`, idempotent on the provider reference),
  `billing_history`, and refresh the `subscriptions` row
  (`current_period_end = +30 days` for one-time crypto purchases).
- **Invoices**: stored records + read-only synthesized receipts for purchases
  that predate the Billing Center. "PDF" = printable window → browser Save as
  PDF (no server-side PDF dependency, nothing uploaded).
- **Usage**: aggregated live from `credit_usage` (90 days, reason-prefix →
  category via `USAGE_CATEGORIES`); `usage_statistics` daily rollups exist for
  future admin analytics (`rollupDailyUsage`).
- **Recommendations**: deterministic rules over real usage
  (`lib/billing/recommendations.ts`) — 90%/70% allowance burn, dominant
  category, active trial, top-ups exceeding plan. Persisted with `rec_key`
  dedupe; dismissals stick; only currently-firing rules are shown.
- **Warnings**: credits <30/15/5% and period end ≤30/14/7/3/1 days —
  continuous buckets with escalating severity, actions Top Up / Upgrade / Renew.

## Security

- Plan changes confirm via dialog before checkout; Enterprise → Contact Sales.
- Payment-method add/remove/default requires a fresh 2FA code when the account
  has 2FA (`x-2fa-token`, same flow as password change).
- No card/wallet data is ever stored — `payment_methods` holds labels only.
- Coupons validate server-side only (`billing_coupons`, no user RLS).

## API

User: `/api/billing/` overview · plans · upgrade · renew · payment-methods
(GET/POST/PATCH/DELETE) · invoices · history · usage · recommendations
(GET/POST-dismiss). Admin: `/api/admin/billing/` plans (GET/PATCH) · coupons
(GET/POST/PATCH) · revenue.

## Known gaps

- Paddle card checkout activates when merchant verification completes; the UI
  states this honestly.
- Annual billing is displayed but checkout is monthly-priced one-time crypto;
  annual invoicing arrives with Paddle subscriptions.
- Coupons are managed in admin and validated server-side, but the top-up
  checkout UI doesn't expose a coupon field yet.
