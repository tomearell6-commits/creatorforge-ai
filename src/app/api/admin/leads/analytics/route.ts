import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * Lead Generator platform analytics (admin-only).
 * GET -> provider usage, credit consumption, compliance & deliverability stats,
 * plus the latest compliance-log entries. Counts use head queries where possible.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const [
    scanCount,
    verifCount,
    syncCount,
    sendCount,
    campaigns,
    failedCampaigns,
    complianceWarnCount,
    emailCampaigns,
    recent,
  ] = await Promise.all([
    // Firecrawl scans == scan events in the compliance log.
    admin
      .from("lead_compliance_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "scan"),
    // NeverBounce verifications.
    admin
      .from("lead_verifications")
      .select("*", { count: "exact", head: true }),
    // Brevo usage = sync events + send events.
    admin
      .from("lead_compliance_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "sync"),
    admin
      .from("lead_compliance_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "send"),
    // Credits consumed — summed in JS (capped).
    admin
      .from("lead_campaigns")
      .select("credits_used")
      .limit(5000),
    admin
      .from("lead_campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
    // Compliance warnings = blocks + suppressions + robots skips.
    admin
      .from("lead_compliance_logs")
      .select("*", { count: "exact", head: true })
      .in("action", [
        "blocked_url",
        "suppress_dnc",
        "suppress_unsub",
        "suppress_invalid",
        "skip_robots",
      ]),
    // Deliverability totals for bounce / unsubscribe rates.
    admin
      .from("lead_email_campaigns")
      .select("sent, bounced, unsubscribed")
      .limit(5000),
    // Latest compliance-log entries.
    admin
      .from("lead_compliance_logs")
      .select("action, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const totalScans = scanCount.count ?? 0;

  const creditsConsumed = (campaigns.data ?? []).reduce(
    (sum, c: { credits_used: number | null }) => sum + (c.credits_used ?? 0),
    0
  );

  const totals = (emailCampaigns.data ?? []).reduce(
    (acc, c: { sent: number | null; bounced: number | null; unsubscribed: number | null }) => {
      acc.sent += c.sent ?? 0;
      acc.bounced += c.bounced ?? 0;
      acc.unsubscribed += c.unsubscribed ?? 0;
      return acc;
    },
    { sent: 0, bounced: 0, unsubscribed: 0 }
  );

  const bounceRate = totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0;
  const unsubscribeRate = totals.sent > 0 ? (totals.unsubscribed / totals.sent) * 100 : 0;

  return NextResponse.json({
    stats: {
      totalScans,
      firecrawlUsage: totalScans,
      neverbounceUsage: verifCount.count ?? 0,
      brevoUsage: (syncCount.count ?? 0) + (sendCount.count ?? 0),
      creditsConsumed,
      failedScans: failedCampaigns.count ?? 0,
      complianceWarnings: complianceWarnCount.count ?? 0,
      bounceRate: Math.round(bounceRate * 10) / 10,
      unsubscribeRate: Math.round(unsubscribeRate * 10) / 10,
    },
    recentCompliance: recent.data ?? [],
  });
}
