# Credit Wallet & Crypto Top-Up

A ledger-based credit wallet that lets users buy extra credits with crypto on top
of their monthly subscription. Designed to integrate with the existing credit
system without breaking any current `deductCredits()` call site.

## 1. Architecture overview

```
Subscription (unchanged)  ──┐
                            ├─► profiles.credits  ◄── AUTHORITATIVE spendable total
Crypto top-up  ─────────────┘        ▲
                                     │ (mirrored, never overwritten directly)
        credit_wallets (cache)  ◄────┤  monthly / bonus / purchased / used buckets
        credit_ledger (truth)   ◄────┘  append-only signed entries + balance_after
```

- **`profiles.credits`** stays the single source of spendable truth, so every
  existing deduction works unchanged.
- **`credit_ledger`** is append-only: every change is a signed row with the
  running `balance_after`. Balances are never overwritten directly.
- **`credit_wallets`** caches the breakdown (monthly / bonus / purchased / used)
  and is maintained atomically by SECURITY DEFINER functions.

### Credit buckets & spend order
Spending draws down **monthly → bonus → purchased** (use renewing/free credits
first; preserve paid credits last). Purchased credits never expire.

## 2. Credit calculation rules

| Action | Source of cost | Credits |
|---|---|---|
| Generate Script | `CREDITS_PER_SCRIPT` | 1 |
| Generate Voiceover | `CREDIT_COSTS.voiceover` | 2 |
| Generate Image / Thumbnail | `CREDIT_COSTS.image` | 3 |
| Generate SEO Article | `SEO_CREDIT_COSTS.article` | 20 |
| Publish to WordPress | `SEO_CREDIT_COSTS.publish` | 2 |
| Render (Slideshow) | `RENDER_TIERS[0]` | 5 |
| Render (AI Standard/Pro/Cinematic) | `RENDER_TIERS[1..3]` | 80 / 200 / 350 |

Estimates surfaced in the UI (`ACTION_CREDIT_ESTIMATES`, `CreditEstimate`) mirror
these real charges, so the estimate always matches the deduction.

**Custom purchase rate:** `CREDITS_PER_USD = 100` (the Starter rate). Named
packages give better rates, so custom is never cheaper than a package.
Min `$10`, max `$2000` (admin-configurable).

## 3. Crypto payment flow

```
Top Up → choose package/custom → choose coin → POST /api/wallet/topup
  → credit_purchases (pending) + crypto_payment_requests (waiting)
  → provider.createPayment() (NOWPayments invoice)
  → user pays → IPN webhook (/api/webhooks/crypto)
  → provider.verifyAndParseWebhook() (HMAC-SHA512, timing-safe)
  → on settled: wallet_credit(purchased) → purchase=completed → notify
  → wallet + history update automatically (client polls /api/wallet)
```

Credits are issued **only** by the verified webhook, **only** on a settled
payment, and **exactly once** (guarded on purchase status + provider charge id).

### Provider interface (`src/lib/payments/providers`)
Crypto is modular. `CryptoProvider` defines `createPayment()` +
`verifyAndParseWebhook()`. `nowpayments.ts` implements it; add a gateway by
registering another implementation and setting `CRYPTO_PROVIDER`. Supported coins
are configurable via `SUPPORTED_CRYPTO` (BTC, ETH, USDT, USDC, LTC, SOL).

If `NOWPAYMENTS_API_KEY` is absent, the flow runs in **preview mode**: a payment
request is created and the checkout panel renders, but no live invoice is issued.

## 4. Ledger system

`credit_ledger` rows: `entry_type` (monthly_renewal | topup_purchase | refund |
bonus | promo | manual_adjustment | generation | rendering | publishing |
admin_adjustment), `bucket`, signed `amount`, `balance_after`, `reason`,
`reference`. Functions (all SECURITY DEFINER, atomic):

- `wallet_ensure(user)` — lazily create a wallet row from the profile.
- `wallet_credit(user, amount, bucket, type, reason, ref)` — grant into a bucket.
- `wallet_renew_monthly(user, allowance)` — reset the monthly bucket on renewal.
- `wallet_adjust(user, ±amount, type, reason)` — admin signed adjustment.
- `deduct_credits(amount, reason)` — **replaced** so every existing call site
  also draws down buckets + writes a ledger row (legacy `credit_usage` kept).

## 5. Database schema (migration `0010_credit_wallet.sql`)

`credit_packages`, `credit_wallets`, `credit_ledger`, `credit_transactions`,
`credit_purchases`, `crypto_payment_requests`, `crypto_payment_confirmations`,
`wallet_notifications`, `wallet_settings`. All user-scoped tables have indexes,
FKs to `auth.users`, and owner-only RLS (read); writes go through SECURITY
DEFINER functions or the service-role webhook. `credit_packages` is
world-readable; seeded with the 6 default packages.

## 6. API routes

User (auth required, owner-scoped):
- `GET  /api/wallet` — server-computed summary.
- `GET  /api/wallet/packages` — active catalogue (DB, constant fallback).
- `POST /api/wallet/quote` — price a custom amount.
- `POST /api/wallet/topup` — create purchase + payment request (rate-limited 10/min).
- `GET  /api/wallet/transactions` — history, filter by status/month/year.
- `GET|PUT /api/wallet/settings` — auto top-up settings.

Admin (`requireAdmin`):
- `GET|POST /api/admin/wallet/packages` — list / create / update / enable / disable.
- `POST /api/admin/wallet/credit` — issue bonus / refund / adjust via ledger (audited).
- `GET  /api/admin/wallet/stats` — revenue, credits sold, conversion.

Webhook: `POST /api/webhooks/crypto` — handles both `topup|…` and legacy `userId|plan` orders.

## 7. Admin management

`/admin/wallet`: payment stats, package CRUD (create/edit/enable/disable), and a
ledger-based grant/refund/adjust form (by user id, signed amount, type, reason).
Every change is written to `credit_ledger` + `audit_logs`.

## 8. Security review

- Balances computed server-side only; client-supplied prices ignored on top-up.
- Credits issued only after webhook signature verification (HMAC-SHA512,
  timing-safe) and only on settled payments.
- Idempotency on purchase status + provider charge id prevents double issuance.
- Owner-only RLS on all user tables; writes via SECURITY DEFINER / service role.
- Rate limiting on the top-up endpoint; admin actions gated by `requireAdmin`
  and recorded in the audit log. Top-up endpoint never exposes credentials.

## 9. Testing guide

1. Run `0010_credit_wallet.sql` (Supabase SQL editor).
2. Visit `/dashboard` — the Credit Wallet card shows the breakdown + usage bar.
3. `/dashboard/credits` — buy a package or custom amount → checkout panel with
   coin, amount, countdown. Without `NOWPAYMENTS_API_KEY` it runs in preview mode.
4. Simulate settlement via the admin grant (`/admin/wallet`) or a live IPN; verify
   purchased credits appear, the ledger + transactions update, and a notification
   is created.
5. Spend credits (any generation) and confirm buckets draw down monthly→bonus→purchased.
6. Drop the balance below 20% / 10% / 0 and confirm the dashboard warnings; at 0,
   generation is blocked but editing/browsing remain.

## 10. Future enhancements

- Auto top-up execution worker (cron) that creates a payment request when the
  balance crosses the threshold (settings already captured).
- Per-coin on-chain address display + live status polling endpoint.
- Downloadable PDF receipts; monthly usage-trend widget; volume-discount tiers
  for custom purchases; webhook retries/dead-letter handling.
