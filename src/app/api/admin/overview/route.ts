import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * Super Admin dashboard stats (Phase 7 — Module 1). Platform-wide metrics
 * computed from core + Phase 6/7 tables via the service-role client.
 */
const PLAN_PRICE: Record<string, number> = { free: 0, creator: 19, pro: 49, agency: 149 };

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [profiles, subs, publishHistory, renderJobs, creditUsage, assets, apiKeys, tickets, billing, sessions] =
    await Promise.all([
      admin.from("profiles").select("plan, credits, status, created_at"),
      admin.from("subscriptions").select("plan, status"),
      admin.from("publish_history").select("status, created_at"),
      admin.from("render_jobs").select("status"),
      admin.from("credit_usage").select("amount"),
      admin.from("assets").select("size_bytes"),
      admin.from("api_keys").select("request_count, revoked"),
      admin.from("support_tickets").select("status"),
      admin.from("billing_events").select("type, amount, status"),
      admin.from("user_sessions").select("last_seen_at"),
    ]);

  const profileRows = profiles.data ?? [];
  const activeSubs = (subs.data ?? []).filter((s) => s.status === "active");
  const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICE[s.plan as string] ?? 0), 0);
  const publishRows = publishHistory.data ?? [];
  const renderRows = renderJobs.data ?? [];
  const activeUsers = (sessions.data ?? []).filter((s) => s.last_seen_at && s.last_seen_at > since).length;
  const failedJobs =
    publishRows.filter((p) => p.status === "failed").length +
    renderRows.filter((r) => r.status === "failed").length;

  const alerts: { level: string; message: string }[] = [];
  if (failedJobs > 0) alerts.push({ level: "warning", message: `${failedJobs} failed job(s) need attention` });
  const openTickets = (tickets.data ?? []).filter((t) => t.status === "open").length;
  if (openTickets > 0) alerts.push({ level: "info", message: `${openTickets} open support ticket(s)` });
  const suspended = profileRows.filter((p) => p.status === "suspended").length;
  if (suspended > 0) alerts.push({ level: "info", message: `${suspended} suspended account(s)` });

  return NextResponse.json({
    totalUsers: profileRows.length,
    activeUsers,
    mrr,
    arr: mrr * 12,
    activeSubscriptions: activeSubs.length,
    creditConsumption: (creditUsage.data ?? []).reduce((s, c) => s + Math.abs(c.amount ?? 0), 0),
    creditsOutstanding: profileRows.reduce((s, p) => s + (p.credits ?? 0), 0),
    renders: renderRows.length,
    storageBytes: (assets.data ?? []).reduce((s, a) => s + (a.size_bytes ?? 0), 0),
    apiRequests: (apiKeys.data ?? []).reduce((s, k) => s + (k.request_count ?? 0), 0),
    activeApiKeys: (apiKeys.data ?? []).filter((k) => !k.revoked).length,
    published: publishRows.filter((p) => p.status === "published").length,
    failedJobs,
    openTickets,
    revenueTotal: (billing.data ?? []).filter((b) => b.type === "payment" && b.status === "completed").reduce((s, b) => s + Number(b.amount), 0),
    planMix: profileRows.reduce((acc: Record<string, number>, p) => {
      acc[p.plan as string] = (acc[p.plan as string] ?? 0) + 1;
      return acc;
    }, {}),
    alerts,
  });
}
