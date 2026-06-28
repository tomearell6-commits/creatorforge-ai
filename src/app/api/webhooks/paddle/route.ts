import { NextResponse } from "next/server";
import { verifyPaddleWebhook, priceToPlan } from "@/lib/payments/paddle";
import { createAdminClient } from "@/lib/supabase/admin";
import { planCredits } from "@/lib/constants";
import { captureError } from "@/lib/logger";

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
      const { data: profile } = await admin
        .from("profiles")
        .select("credits")
        .eq("user_id", userId)
        .single();

      await admin
        .from("profiles")
        .update({ plan, credits: (profile?.credits ?? 0) + grant })
        .eq("user_id", userId);

      await admin
        .from("credit_usage")
        .insert({ user_id: userId, amount: grant, reason: `subscription_grant:${plan}` });

      const totals = (data.details as { totals?: { total?: string } } | undefined)?.totals;
      await admin.from("payment_transactions").insert({
        user_id: userId,
        provider: "paddle",
        provider_txn_id: txnId,
        amount: totals?.total ? Number(totals.total) / 100 : null,
        currency: (data.currency_code as string) ?? "USD",
        status: "completed",
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
    }
  } catch (e) {
    captureError(e, { category: "payment", provider: "paddle", stage: "handler" });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
