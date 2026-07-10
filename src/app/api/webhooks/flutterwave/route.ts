import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyFlutterwaveWebhook, verifyFlutterwaveTransaction } from "@/lib/payments/flutterwave";
import { creditWalletAdmin, notifyWallet } from "@/lib/credits/wallet";
import { recordInvoice } from "@/lib/billing/invoices";
import { PLANS, planCredits } from "@/lib/constants";
import { notify, clearCreditDedup } from "@/lib/notifications/service";
import { topupSuccessEmail } from "@/lib/email/templates";
import { captureError } from "@/lib/logger";

/**
 * Flutterwave webhook. Verifies the `verif-hash` header, then re-verifies the
 * transaction server-side before granting anything. Grants credits (top-up) or a
 * plan's monthly credits + subscription, exactly once (guarded on our row's
 * status). Reuses the SAME provider-neutral wallet/invoice helpers as the rest
 * of billing — it does not touch the crypto flow.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyFlutterwaveWebhook(request.headers.get("verif-hash"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; data?: { id?: string | number; tx_ref?: string; status?: string } };
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad payload" }, { status: 400 }); }

  const data = payload?.data ?? {};
  const txRef = data.tx_ref ?? "";
  // Only act on completed charges that claim success; we still verify below.
  if (payload.event !== "charge.completed" || data.status !== "successful" || !txRef || !data.id) {
    return NextResponse.json({ received: true, ignored: true });
  }

  let admin;
  try { admin = createAdminClient(); }
  catch (e) { captureError(e, { where: "flw-webhook", stage: "admin" }); return NextResponse.json({ error: "Server not configured" }, { status: 500 }); }

  const { data: row } = await admin
    .from("flutterwave_payments")
    .select("id, user_id, kind, plan, credits, amount_usd, status")
    .eq("tx_ref", txRef).maybeSingle();
  if (!row) return NextResponse.json({ received: true, note: "unknown tx_ref" });
  if (row.status === "successful") return NextResponse.json({ received: true, duplicate: true });

  // Re-verify with Flutterwave — never grant on the webhook body alone.
  let verified;
  try { verified = await verifyFlutterwaveTransaction(data.id); }
  catch (e) { captureError(e, { where: "flw-webhook", stage: "verify" }); return NextResponse.json({ error: "verify failed" }, { status: 502 }); }

  const amountOk = verified.successful && verified.txRef === txRef && verified.amount >= Number(row.amount_usd) - 0.01;
  if (!amountOk) {
    await admin.from("flutterwave_payments").update({ status: "failed", flw_tx_id: verified.flwTxId, flw_ref: verified.flwRef }).eq("id", row.id);
    return NextResponse.json({ received: true, verified: false });
  }

  try {
    if (row.kind === "plan" && row.plan) {
      const planObj = PLANS.find((p) => p.id === row.plan);
      const { data: prior } = await admin.from("profiles").select("plan").eq("user_id", row.user_id).maybeSingle();
      await creditWalletAdmin(admin, row.user_id, planCredits(row.plan), "monthly", "topup_purchase", `flutterwave_plan:${row.plan}`, verified.flwTxId);
      await admin.from("profiles").update({ plan: row.plan }).eq("user_id", row.user_id);

      const subRow = {
        user_id: row.user_id, plan: row.plan, status: "active", billing_cycle: "monthly",
        provider: "flutterwave", current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(), updated_at: new Date().toISOString(),
      };
      const { data: existingSub } = await admin
        .from("subscriptions").select("id").eq("user_id", row.user_id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existingSub) await admin.from("subscriptions").update(subRow).eq("id", existingSub.id);
      else await admin.from("subscriptions").insert(subRow);

      const priorPrice = PLANS.find((p) => p.id === prior?.plan)?.price ?? 0;
      await recordInvoice({
        userId: row.user_id,
        description: `${planObj?.name ?? row.plan} plan — ${planCredits(row.plan).toLocaleString()} credits (30 days)`,
        amountUsd: planObj?.price ?? Number(row.amount_usd), planId: row.plan, paymentMethod: "flutterwave",
        reference: verified.flwTxId, eventType: prior?.plan === row.plan ? "renewal" : (planObj?.price ?? 0) >= priorPrice ? "upgrade" : "downgrade",
      }).catch(() => {});
    } else {
      // Top-up: purchased credits.
      await creditWalletAdmin(admin, row.user_id, row.credits, "purchased", "topup_purchase", "Flutterwave card top-up", verified.flwTxId);
      await recordInvoice({
        userId: row.user_id, description: `Credit top-up — ${row.credits.toLocaleString()} credits`,
        amountUsd: Number(row.amount_usd), paymentMethod: "flutterwave", reference: verified.flwTxId, eventType: "topup",
      }).catch(() => {});
      await notifyWallet(admin, row.user_id, "credits_added", "Credits added 🎉", `${row.credits.toLocaleString()} credits were added to your wallet.`);
    }

    await admin.from("flutterwave_payments").update({ status: "successful", flw_tx_id: verified.flwTxId, flw_ref: verified.flwRef }).eq("id", row.id);

    // Bell + email (best-effort).
    let email: string | null = null;
    try { const { data: u } = await admin.auth.admin.getUserById(row.user_id); email = u.user?.email ?? null; } catch { /* ignore */ }
    await notify(admin, {
      userId: row.user_id, email, type: "topup_success", category: row.kind === "plan" ? "subscription" : "credit",
      title: row.kind === "plan" ? "Plan activated" : "Credit top-up successful",
      message: row.kind === "plan" ? `Your ${row.plan} plan is active.` : `${row.credits.toLocaleString()} credits were added to your wallet.`,
      ctaLabel: row.kind === "plan" ? "Open Billing" : "Open Credit Wallet", ctaUrl: row.kind === "plan" ? "/dashboard/billing" : "/dashboard/credits",
      mail: row.kind === "plan" ? undefined : topupSuccessEmail(row.credits),
    }).catch(() => {});
    if (row.kind !== "plan") await clearCreditDedup(admin, row.user_id, new Date().toISOString().slice(0, 10)).catch(() => {});
  } catch (e) {
    captureError(e, { category: "payment", provider: "flutterwave", stage: "grant" });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true, granted: true });
}
