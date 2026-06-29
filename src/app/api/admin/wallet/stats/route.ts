import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/** GET — platform-wide wallet/payment statistics for the admin portal. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const [purchases, completed, requests, txns] = await Promise.all([
    admin.from("credit_purchases").select("usd_amount, credits, status"),
    admin.from("credit_purchases").select("id", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("crypto_payment_requests").select("id", { count: "exact", head: true }),
    admin.from("credit_transactions").select("id", { count: "exact", head: true }).eq("transaction_type", "purchase"),
  ]);

  const rows = purchases.data ?? [];
  const completedRows = rows.filter((r) => r.status === "completed");
  const revenueUsd = completedRows.reduce((s, r) => s + Number(r.usd_amount ?? 0), 0);
  const creditsSold = completedRows.reduce((s, r) => s + Number(r.credits ?? 0), 0);

  return NextResponse.json({
    stats: {
      revenueUsd: Math.round(revenueUsd * 100) / 100,
      creditsSold,
      completedPurchases: completed.count ?? 0,
      totalPurchaseAttempts: txns.count ?? 0,
      paymentRequests: requests.count ?? 0,
      conversionRate: (txns.count ?? 0) > 0 ? Math.round(((completed.count ?? 0) / (txns.count ?? 1)) * 100) : 0,
    },
  });
}
