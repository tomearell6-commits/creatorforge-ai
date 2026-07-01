import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * Admin notification delivery observability (Phase 6 — Module 6).
 * GET -> recent delivery logs plus summary stats (counts via head queries).
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
  const now = new Date();
  const in14d = new Date(now.getTime() + 14 * 86400000).toISOString();

  const [logs, totalSent, failedEmails, paymentFailures, lowCredit, expiringSubs] =
    await Promise.all([
      admin
        .from("notification_delivery_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("notification_delivery_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent"),
      admin
        .from("notification_delivery_logs")
        .select("*", { count: "exact", head: true })
        .eq("channel", "email")
        .eq("status", "failed"),
      admin
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("type", "payment_failed"),
      admin
        .from("notifications")
        .select("id")
        .in("type", ["credits_low", "credits_critical", "credits_exhausted"])
        .gte("created_at", since30d)
        .limit(1000),
      admin
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .gte("current_period_end", now.toISOString())
        .lte("current_period_end", in14d),
    ]);

  return NextResponse.json({
    logs: logs.data ?? [],
    stats: {
      totalSent: totalSent.count ?? 0,
      failedEmails: failedEmails.count ?? 0,
      paymentFailures: paymentFailures.count ?? 0,
      lowCreditUsers: (lowCredit.data ?? []).length,
      expiringSubs: expiringSubs.count ?? 0,
    },
  });
}
