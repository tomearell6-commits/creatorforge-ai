import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * Admin revenue dashboard payload: totals (30d / all-time), recent invoices,
 * failed payments, and recent top-ups — sourced from invoice_records,
 * billing_history and credit_purchases.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();

  const [{ data: invoices }, { data: failed }, { data: topups }, { data: purchasesAll }] = await Promise.all([
    admin.from("invoice_records")
      .select("invoice_number, invoice_date, plan_id, description, amount_usd, status, payment_method, user_id")
      .order("invoice_date", { ascending: false }).limit(50),
    admin.from("billing_history")
      .select("created_at, description, plan_id, user_id")
      .eq("event_type", "failed_payment")
      .order("created_at", { ascending: false }).limit(50),
    admin.from("credit_purchases")
      .select("created_at, credits, usd_amount, status, user_id")
      .order("created_at", { ascending: false }).limit(50),
    admin.from("credit_purchases").select("usd_amount, status, created_at").eq("status", "completed").limit(5000),
  ]);

  const paidInvoices = (invoices ?? []).filter((i) => i.status === "paid");
  const completed = purchasesAll ?? [];
  const sum = (rows: { usd_amount?: unknown; amount_usd?: unknown }[]) =>
    Math.round(rows.reduce((s, r) => s + Number(r.usd_amount ?? r.amount_usd ?? 0), 0) * 100) / 100;

  return NextResponse.json({
    totals: {
      allTimeTopupsUsd: sum(completed),
      last30dTopupsUsd: sum(completed.filter((p) => p.created_at >= since30)),
      invoicedLast30dUsd: sum(paidInvoices.filter((i) => i.invoice_date >= since30)),
      failedPayments: (failed ?? []).length,
    },
    invoices: invoices ?? [],
    failedPayments: failed ?? [],
    topups: topups ?? [],
  });
}
