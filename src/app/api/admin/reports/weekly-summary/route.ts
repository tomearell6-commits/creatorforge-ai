import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * GET /api/admin/reports/weekly-summary
 * Platform-wide analytics for the weekly-summary feature: delivery counts,
 * low-credit / failed-job user counts, and recent delivery logs.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [sent, failed, lowCredit, failedJobRows, logs] = await Promise.all([
    admin
      .from("weekly_summary_delivery_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent"),
    admin
      .from("weekly_summary_delivery_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .lte("credits", 10),
    admin
      .from("weekly_usage_reports")
      .select("user_id")
      .gt("failed_jobs", 0)
      .gte("created_at", thirtyDaysAgo)
      .limit(1000),
    admin
      .from("weekly_summary_delivery_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const usersWithFailedJobs = new Set((failedJobRows.data ?? []).map((r) => r.user_id)).size;

  return NextResponse.json({
    stats: {
      summariesSent: sent.count ?? 0,
      failedDeliveries: failed.count ?? 0,
      openRate: null,
      clickRate: null,
      lowCreditUsers: lowCredit.count ?? 0,
      usersWithFailedJobs,
      // Placeholder: identifying users with no recent automation activity is
      // not tractable from these tables alone.
      inactiveAutomationUsers: null,
    },
    logs: logs.data ?? [],
  });
}
