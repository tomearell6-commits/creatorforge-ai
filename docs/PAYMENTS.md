# Payment Architecture

Payments are **not connected** in Phase 1. This document describes the modular structure
that's already in place so Phase 2 can drop in real providers without restructuring.

## Design

The app expects a payment provider to expose two capabilities:

1. **Create a checkout session** → returns a URL to redirect the user to.
2. **Verify + handle a webhook** → confirms payment and updates the database.

Two providers are scaffolded behind that shape:

| Provider | File | Supports |
|---|---|---|
| Paddle | `src/lib/payments/paddle.ts` | Subscriptions + one-time checkout |
| Crypto | `src/lib/payments/crypto.ts` | One-time crypto charges |

Webhook receivers already exist (returning a safe no-op until implemented):

- `POST /api/webhooks/paddle` → `src/app/api/webhooks/paddle/route.ts`
- `POST /api/webhooks/crypto` → `src/app/api/webhooks/crypto/route.ts`

## Credit-based usage

Plans grant a monthly **credit** allowance (see `PLANS` in `src/lib/constants.ts`). Credits
live on `profiles.credits`, and every grant/spend is recorded in the `credit_usage` ledger.

As of Phase 2, **real AI generations cost `CREDITS_PER_SCRIPT` (1) credit**, deducted
atomically by the `deduct_credits()` Postgres function (`src/lib/credits.ts`). The offline
placeholder engine still charges **0 credits**. What remains for Phase 3 is *granting*
credits — monthly plan allowances and top-up purchases — on successful payment.

## Where API keys go (Phase 2)

Set these in `.env.local` (see [ENVIRONMENT.md](ENVIRONMENT.md)):

```
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
CRYPTO_PAYMENT_API_KEY=
CRYPTO_PAYMENT_WEBHOOK_SECRET=
```

## Phase 4 — Track D (implemented): Paddle subscriptions

**How it works**
1. **Checkout** is client-side via Paddle.js (`src/components/dashboard/PaddleCheckout.tsx`).
   The billing page renders an **Upgrade** button per paid plan that opens the Paddle
   overlay for that plan's Price ID, tagging the buyer with `customData: { userId, plan }`.
2. **Webhook** (`src/app/api/webhooks/paddle/route.ts`) verifies the `Paddle-Signature`
   header (HMAC-SHA256 of `ts:rawBody`, timing-safe, 5-min freshness window) via
   `verifyPaddleWebhook`, then:
   - `transaction.completed` → grants the plan's monthly credits, sets the plan, records a
     `payment_transactions` row (idempotent on `provider_txn_id`).
   - `subscription.created/updated/activated` → upserts `subscriptions`, sets the plan.
   - `subscription.canceled` → marks canceled, downgrades to `free`.
   Writes use the **service-role admin client** (`src/lib/supabase/admin.ts`) since there's
   no user session in a webhook.
3. **Crypto (NOWPayments)** — `src/lib/payments/crypto.ts` + `POST /api/crypto/checkout`
   create a hosted invoice (order_id = `<userId>|<plan>`) and the **Pay with crypto** button
   redirects to it. The IPN webhook (`src/app/api/webhooks/crypto/route.ts`) verifies the
   `x-nowpayments-sig` header (HMAC-SHA512 of the key-sorted JSON body), and on a
   `finished`/`confirmed` payment grants credits, sets the plan, and records a
   `crypto_transactions` row (idempotent on `charge_id`). Crypto is treated as a one-time
   purchase of the plan's monthly credits (not recurring).
4. **Credit metering** (Track D, step 1): real media generations now cost credits
   (`CREDIT_COSTS` in `constants.ts`): voiceover 2, image 3, thumbnail 3, script 1.
   Placeholder providers remain free.

**Env vars** — see `.env.example`. Paddle: `PADDLE_ENV`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`,
`NEXT_PUBLIC_PADDLE_PRICE_{CREATOR,PRO,AGENCY}`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`.
Crypto: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_API_PUBLIC_KEY`, `NOWPAYMENTS_IPN_SECRET`.
Both webhooks: `SUPABASE_SERVICE_ROLE_KEY`.

**To test (sandbox):** the webhook needs a public URL, so deploy (Vercel) or run a tunnel
(e.g. `ngrok http 3000`); register that URL at **Paddle → Developer Tools → Notifications**,
copy the signing secret into `PADDLE_WEBHOOK_SECRET`, then complete a sandbox checkout with a
test card and confirm credits/plan update.

**To go live:** swap the sandbox token + Price IDs for live ones, set `PADDLE_ENV=production`,
register the production webhook, and verify the Paddle account is approved to sell.

Both webhooks (Paddle + NOWPayments IPN) need a public URL and `SUPABASE_SERVICE_ROLE_KEY`
to grant credits; set the NOWPayments IPN callback to `<app>/api/webhooks/crypto` (it's set
automatically from `NEXT_PUBLIC_APP_URL`).

**Still open before a paid launch:** pre-launch legal pages (Terms, Privacy), and a NOWPayments
payout wallet configured for real settlement.

## Phase 2 implementation checklist

- [ ] Paddle: implement `createPaddleSubscription` / `createPaddleOneTimeCheckout`.
- [ ] Paddle: implement `verifyPaddleWebhook` and handle `subscription.*` / `transaction.*`.
- [ ] Crypto: implement `createCryptoCheckout` against your provider (Coinbase Commerce,
      NOWPayments, BTCPay, etc.).
- [ ] Crypto: implement `verifyCryptoWebhook` and handle charge confirmation.
- [ ] On successful payment: upsert `subscriptions`, insert `payment_transactions` /
      `crypto_transactions`, grant credits (`profiles.credits` + `credit_usage`).
- [x] Deduct credits in `/api/generate-script` when real AI generation is enabled.
      *(Done in Phase 2 via `deduct_credits()`.)*
- [ ] Add "Upgrade" buttons on `/dashboard/billing` that POST to a checkout route.
