# Flutterwave Payments (Card + Mobile Money)

A card + Mobile Money payment path for CreatorsForge, built for a **Cameroon**
(Central/West Africa) business. Fully **additive and independent** of the
existing crypto and Paddle flows — it adds files, changes nothing in them.

## Why
Flutterwave is licensed in Cameroon (BEAC) and accepts Visa/Mastercard/Amex
plus MTN MoMo / Orange (Francophone) Mobile Money, with recurring support — so a
real Cameroon business can take card + mobile payments legally, in USD.

## Flow
1. User clicks **Pay with Card or Mobile Money** (`FlutterwaveTopupCard` on
   `/dashboard/credits`, or a plan checkout).
2. `POST /api/flutterwave/checkout` computes the amount server-side, writes a
   `pending` row to `flutterwave_payments`, and creates a Flutterwave hosted
   checkout → returns the payment `link`. The browser redirects there.
3. User pays. Flutterwave calls **`/api/webhooks/flutterwave`**.
4. The webhook verifies the `verif-hash` header, **re-verifies the transaction
   server-side** (`/v3/transactions/{id}/verify`), then grants credits (top-up)
   or the plan's monthly credits + subscription — **exactly once** (guarded on
   the row's `status`). Reuses the shared `creditWalletAdmin` / `recordInvoice`
   helpers; does not touch crypto.

## Files (all new)
- `supabase/migrations/0037_flutterwave.sql` — `flutterwave_payments` (owner
  select/insert RLS; service-role updates only).
- `src/lib/payments/flutterwave.ts` — `createFlutterwavePayment`,
  `verifyFlutterwaveTransaction`, `verifyFlutterwaveWebhook`, `isFlutterwaveConfigured`.
- `src/app/api/flutterwave/checkout/route.ts` — creates checkout (topup | plan).
- `src/app/api/webhooks/flutterwave/route.ts` — verify + grant.
- `src/components/dashboard/FlutterwaveTopupCard.tsx` — credits-page card.

## Setup (when your account is approved)
1. **Run migration** `0037_flutterwave.sql` in Supabase.
2. **Vercel env vars:**
   - `FLUTTERWAVE_SECRET_KEY` = your live secret key (`FLWSECK-…`)
   - `FLUTTERWAVE_WEBHOOK_HASH` = a secret string you choose (see step 3)
   - `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` = your public key (`FLWPUBK-…`, optional)
3. **Flutterwave dashboard → Settings → Webhooks:**
   - URL: `https://www.creatorsforge.io/api/webhooks/flutterwave`
   - Secret hash: the **same** value you put in `FLUTTERWAVE_WEBHOOK_HASH`
4. Redeploy. Until the keys are set, the checkout runs in **preview mode**
   (no charge) — nothing breaks.

## Notes
- Prices are in **USD**; Cameroon accounts typically **settle in XAF** (auto
  converted on payout) — expected.
- The webhook never grants on the callback body alone — it always re-verifies
  the transaction with Flutterwave first, and compares the amount.
- Crypto and Paddle are untouched and keep working.
