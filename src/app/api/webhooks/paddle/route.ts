import { NextResponse } from "next/server";
import { verifyPaddleWebhook, priceToPlan } from "@/lib/payments/paddle";
import { createAdminClient } from "@/lib/supabase/admin";
import { planCredits } from "@/lib/constants";
import { creditWalletAdmin } from "@/lib/credits/wallet";
import { captureError } from "@/lib/logger";
import { notify, clearCreditDedup } from "@/lib/notifications/service";
import { subscriptionRenewedEmail, paymentFailedEmail, subscriptionExpiredEmail } from "@/lib/email/templates";

async function emailFor(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<string | null> {
  try { const { data } = await admin.auth.admin.getUserById(userId); return data.user?.email ?? null; } catch { return null; }
}

/**
 * Paddle Billing webhook. Verifies the signature, then on the relevant events
 * grants the plan's monthly credits and records the subscription/transaction.
 * Uses the service-role admin client (no user session here).
 *
 * Handled events:
 *  - transaction.completed         → grant credits + set plan + record txn (idempotent)
 *  - subscription.created/updated  → upsert subscription + set plan
 *  - subscription.canceled         → mark canceled + downgrade to free
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("paddle-signature");

  if (!verifyPaddleWebhook(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event_type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = event.event_type;
  const data = (event.data ?? {}) as Record<string, unknown>;
  const customData = (data.custom_data ?? {}) as { userId?: string; plan?: string };
  const userId = customData.userId;
  const items = (data.items ?? []) as { price?: { id?: string } }[];
  const priceId = items[0]?.price?.id;
  const plan = priceToPlan(priceId);

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("Paddle webhook: admin client not configured", e);
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    if (type === "transaction.completed" && userId && plan) {
      const txnId = String(data.id ?? "");
      // Idempotency: skip if we've already recorded this transaction.
      const { data: existing } = await admin
        .from("payment_transactions")
        .select("id")
        .eq("provider_txn_id", txnId)
        .maybeSingle();
      if (existing) return NextResponse.json({ received: true, duplicate: true });

      const grant = planCredits(plan);
      // Atomic wallet credit (ledger + buckets + balance) — avoids the lost-update
      // race of a read-then-write, matching the crypto webhook path.
      await creditWalletAdmin(admin, userId, grant, "monthly", "subscription_grant", `paddle_plan:${plan}`, txnId);
      await admin.from("profiles").update({ plan }).eq("user_id", userId);

      const totals = (data.details as { totals?: { total?: string } } | undefined)?.totals;
      await admin.from("payment_transactions").insert({
        user_id: userId,
        provider: "paddle",
        provider_txn_id: txnId,
        amount: totals?.total ? Number(totals.total) / 100 : null,
        currency: (data.currency_code as string) ?? "USD",
        status: "completed",
      });

      // Notify: subscription renewed + refresh credit-alert dedup for the new cycle.
      const email = await emailFor(admin, userId);
      await notify(admin, {
        userId, email, type: "subscription_renewed", category: "subscription",
        title: "Subscription renewed", message: `Your ${plan} plan renewed and your monthly credits were refreshed.`,
        ctaLabel: "Open Dashboard", ctaUrl: "/dashboard", mail: subscriptionRenewedEmail(plan),
      });
      await clearCreditDedup(admin, userId, new Date().toISOString().slice(0, 10)).catch(() => {});
    } else if (type === "transaction.payment_failed" && userId) {
      const email = await emailFor(admin, userId);
      await notify(admin, {
        userId, email, type: "payment_failed", category: "payment",
        title: "Payment failed", message: `We couldn't process your payment for the ${plan ?? "current"} plan. Please update your payment method.`,
        ctaLabel: "Update Payment", ctaUrl: "/dashboard/billing", mail: paymentFailedEmail(plan ?? "your"),
      });
    } else if (
      (type === "subscription.created" ||
        type === "subscription.updated" ||
        type === "subscription.activated") &&
      userId
    ) {
      const subId = String(data.id ?? "");
      const periodEnd = (data.current_billing_period as { ends_at?: string } | undefined)?.ends_at;
      const { data: existing } = await admin
        .from("subscriptions")
        .select("id")
        .eq("provider_sub_id", subId)
        .maybeSingle();

      const row = {
        user_id: userId,
        plan: plan ?? "free",
        status: (data.status as string) ?? "active",
        provider: "paddle",
        provider_sub_id: subId,
        current_period_end: periodEnd ?? null,
      };
      if (existing) await admin.from("subscriptions").update(row).eq("id", existing.id);
      else await admin.from("subscriptions").insert(row);

      if (plan) await admin.from("profiles").update({ plan }).eq("user_id", userId);
    } else if (type === "subscription.canceled" && userId) {
      const subId = String(data.id ?? "");
      await admin.from("subscriptions").update({ status: "canceled" }).eq("provider_sub_id", subId);
      await admin.from("profiles").update({ plan: "free" }).eq("user_id", userId);

      const email = await emailFor(admin, userId);
      await notify(admin, {
        userId, email, type: "subscription_cancelled", category: "subscription",
        title: "Subscription cancelled", message: "Your subscription was cancelled. You can renew any time to restore your plan.",
        ctaLabel: "Renew", ctaUrl: "/dashboard/billing", mail: subscriptionExpiredEmail(plan ?? "your"),
      });
    }
  } catch (e) {
    captureError(e, { category: "payment", provider: "paddle", stage: "handler" });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
