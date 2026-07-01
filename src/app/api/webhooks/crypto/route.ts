import { NextResponse } from "next/server";
import { getCryptoProvider } from "@/lib/payments/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import { planCredits } from "@/lib/constants";
import { creditWalletAdmin, notifyWallet } from "@/lib/credits/wallet";
import { captureError } from "@/lib/logger";
import { notify, clearCreditDedup } from "@/lib/notifications/service";
import { topupSuccessEmail } from "@/lib/email/templates";

/**
 * Crypto IPN webhook. Verifies the signature via the configured provider, then:
 *  - order "topup|<userId>|<purchaseId>"  → issue purchased credits to the wallet
 *  - order "<userId>|<plan>"              → grant a subscription plan's credits
 * Credits are issued ONLY on a settled payment, and idempotently (guarded on the
 * provider payment id and the purchase status). Uses the service-role client.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-nowpayments-sig");

  const provider = getCryptoProvider();
  const result = provider.verifyAndParseWebhook(raw, signature);
  if (!result.valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const orderId = result.orderReference ?? "";
  const chargeId = result.providerPaymentId ?? "";

  let admin;
  try { admin = createAdminClient(); }
  catch (e) {
    console.error("Crypto webhook: admin client not configured", e);
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  // Record the confirmation attempt (audit) regardless of status.
  if (orderId.startsWith("topup|")) {
    const [, , purchaseId] = orderId.split("|");
    const { data: req } = await admin
      .from("crypto_payment_requests").select("id, user_id, status")
      .eq("order_reference", orderId).maybeSingle();

    if (req) {
      await admin.from("crypto_payment_confirmations").insert({
        payment_request_id: req.id, user_id: req.user_id, tx_hash: result.txHash ?? null,
        confirmation_count: result.confirmations ?? 0, payment_status: result.status,
        raw_payload: safeJson(raw), confirmed_at: result.settled ? new Date().toISOString() : null,
      });
      await admin.from("crypto_payment_requests")
        .update({ status: result.settled ? "finished" : result.status, amount_crypto: result.amountCrypto ?? null, crypto_currency: result.currency ?? null, updated_at: new Date().toISOString() })
        .eq("id", req.id);

      if (!result.settled) {
        if (result.status === "confirming") await notifyWallet(admin, req.user_id, "payment_pending", "Payment detected", "We're waiting for blockchain confirmation.");
        return NextResponse.json({ received: true, status: result.status });
      }
    }

    return await completeTopup(admin, purchaseId, chargeId, result);
  }

  // ---- Subscription plan grant (legacy path) ----
  const [userId, plan] = orderId.split("|");
  if (!result.settled) return NextResponse.json({ received: true, status: result.status });
  if (!userId || !plan) return NextResponse.json({ received: true, note: "no order mapping" });

  try {
    const { data: existing } = await admin
      .from("crypto_transactions").select("id").eq("charge_id", chargeId).maybeSingle();
    if (existing) return NextResponse.json({ received: true, duplicate: true });

    await creditWalletAdmin(admin, userId, planCredits(plan), "monthly", "topup_purchase", `crypto_plan:${plan}`, chargeId);
    await admin.from("profiles").update({ plan }).eq("user_id", userId);
    await admin.from("crypto_transactions").insert({
      user_id: userId, provider: provider.id, charge_id: chargeId,
      amount: result.amountCrypto ?? 0, currency: result.currency ?? null, status: "completed",
    });
  } catch (e) {
    captureError(e, { category: "payment", provider: provider.id, stage: "plan_grant" });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

/** Issue purchased credits for a top-up exactly once. */
async function completeTopup(
  admin: ReturnType<typeof createAdminClient>,
  purchaseId: string,
  chargeId: string,
  result: { currency?: string; amountCrypto?: number; txHash?: string },
) {
  try {
    const { data: purchase } = await admin
      .from("credit_purchases").select("id, user_id, credits, status").eq("id", purchaseId).maybeSingle();
    if (!purchase) return NextResponse.json({ received: true, note: "purchase not found" });
    if (purchase.status === "completed") return NextResponse.json({ received: true, duplicate: true });

    // Issue purchased credits into the wallet (ledger + buckets + balance).
    await creditWalletAdmin(admin, purchase.user_id, purchase.credits, "purchased", "topup_purchase", "Crypto credit top-up", chargeId || purchase.id);

    await admin.from("credit_purchases").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", purchase.id);
    await admin.from("credit_transactions")
      .update({ payment_status: "completed", transaction_id: result.txHash ?? chargeId ?? null, crypto_currency: result.currency ?? null, updated_at: new Date().toISOString() })
      .eq("payment_reference", `topup|${purchase.user_id}|${purchase.id}`);

    await notifyWallet(admin, purchase.user_id, "credits_added",
      "Credits added 🎉", `${purchase.credits.toLocaleString()} credits were added to your wallet.`);

    // Bell + email via the notification system; refresh credit-alert dedup so a
    // later drop can re-alert this cycle.
    let email: string | null = null;
    try { const { data } = await admin.auth.admin.getUserById(purchase.user_id); email = data.user?.email ?? null; } catch { /* ignore */ }
    await notify(admin, {
      userId: purchase.user_id, email, type: "topup_success", category: "credit",
      title: "Credit top-up successful", message: `${purchase.credits.toLocaleString()} credits were added to your wallet.`,
      ctaLabel: "Open Credit Wallet", ctaUrl: "/dashboard/credits", mail: topupSuccessEmail(purchase.credits),
    });
    await clearCreditDedup(admin, purchase.user_id, new Date().toISOString().slice(0, 10)).catch(() => {});
  } catch (e) {
    captureError(e, { category: "payment", stage: "topup_complete" });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
  return NextResponse.json({ received: true, credited: true });
}

function safeJson(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return null; }
}
