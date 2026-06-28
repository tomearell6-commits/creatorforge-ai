import { NextResponse } from "next/server";
import { verifyCryptoWebhook } from "@/lib/payments/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { planCredits } from "@/lib/constants";
import { captureError } from "@/lib/logger";

/**
 * NOWPayments IPN webhook. Verifies the signature, and on a confirmed/finished
 * payment grants the plan's credits, sets the plan, and records a
 * crypto_transactions row (idempotent on charge_id). Uses the service-role
 * admin client (no user session in a webhook).
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-nowpayments-sig");

  if (!verifyCryptoWebhook(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = String(data.payment_status ?? "");
  const orderId = String(data.order_id ?? "");
  const [userId, plan] = orderId.split("|");

  // Only grant once the payment is actually settled.
  if (status !== "finished" && status !== "confirmed") {
    return NextResponse.json({ received: true, status });
  }
  if (!userId || !plan) {
    return NextResponse.json({ received: true, note: "no order mapping" });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("Crypto webhook: admin client not configured", e);
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const chargeId = String(data.payment_id ?? data.invoice_id ?? "");

  try {
    // Idempotency: skip if we've already recorded this charge.
    const { data: existing } = await admin
      .from("crypto_transactions")
      .select("id")
      .eq("charge_id", chargeId)
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
      .insert({ user_id: userId, amount: grant, reason: `crypto_grant:${plan}` });

    await admin.from("crypto_transactions").insert({
      user_id: userId,
      provider: "nowpayments",
      charge_id: chargeId,
      amount: Number(data.pay_amount ?? data.price_amount ?? 0),
      currency: String(data.pay_currency ?? "").toUpperCase() || null,
      status: "completed",
    });
  } catch (e) {
    captureError(e, { category: "payment", provider: "nowpayments", stage: "handler" });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
