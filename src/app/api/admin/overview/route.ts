import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Super Admin dashboard stats (Phase 7 — Module 1). Platform-wide metrics
 * computed from core + Phase 6/7 tables via the service-role client.
 */
const PLAN_PRICE: Record<string, number> = { free: 0, creator: 19, pro: 49, agency: 149, enterprise: 0 };

type Admin = ReturnType<typeof createAdminClient>;
const PAGE = 1000; // the database returns at most 1,000 rows per request

/**
 * Read EVERY row of a table (only the columns we need), page by page. A plain select
 * silently stops at 1,000 rows, which would make totals such as credit consumption wrong
 * as the platform grows.
 */
async function fetchAll<T>(admin: Admin, table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...(data as unknown as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [profileRows, subRows, publishRows, renderRows, creditRows, assetRows, apiKeyRows, ticketRows, billingRows, sessionRows] =
    await Promise.all([
      fetchAll<{ plan: string; credits: number | null; status: string | null }>(admin, "profiles", "plan, credits, status"),
      fetchAll<{ plan: string; status: string }>(admin, "subscriptions", "plan, status"),
      fetchAll<{ status: string }>(admin, "publish_history", "status"),
      fetchAll<{ status: string }>(admin, "render_jobs", "status"),
      fetchAll<{ amount: number | null }>(admin, "credit_usage", "amount"),
      fetchAll<{ size_bytes: number | null }>(admin, "assets", "size_bytes"),
      fetchAll<{ request_count: number | null; revoked: boolean }>(admin, "api_keys", "request_count, revoked"),
      fetchAll<{ status: string }>(admin, "support_tickets", "status"),
      fetchAll<{ type: string; amount: number | string; status: string }>(admin, "billing_events", "type, amount, status"),
      fetchAll<{ last_seen_at: string | null }>(admin, "user_sessions", "last_seen_at"),
    ]);

  const activeSubs = subRows.filter((s) => s.status === "active");
  const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICE[s.plan] ?? 0), 0);
  const activeUsers = sessionRows.filter((s) => s.last_seen_at && s.last_seen_at > since).length;
  const failedJobs =
    publishRows.filter((p) => p.status === "failed").length +
    renderRows.filter((r) => r.status === "failed").length;

  const alerts: { level: string; message: string }[] = [];
  if (failedJobs > 0) alerts.push({ level: "warning", message: `${failedJobs} failed job(s) need attention` });
  const openTickets = ticketRows.filter((t) => t.status === "open").length;
  if (openTickets > 0) alerts.push({ level: "info", message: `${openTickets} open support ticket(s)` });
  const suspended = profileRows.filter((p) => p.status === "suspended").length;
  if (suspended > 0) alerts.push({ level: "info", message: `${suspended} suspended account(s)` });

  return NextResponse.json({
    totalUsers: profileRows.length,
    activeUsers,
    mrr,
    arr: mrr * 12,
    activeSubscriptions: activeSubs.length,
    creditConsumption: creditRows.reduce((s, c) => s + Math.abs(c.amount ?? 0), 0),
    creditsOutstanding: profileRows.reduce((s, p) => s + (p.credits ?? 0), 0),
    renders: renderRows.length,
    storageBytes: assetRows.reduce((s, a) => s + (a.size_bytes ?? 0), 0),
    apiRequests: apiKeyRows.reduce((s, k) => s + (k.request_count ?? 0), 0),
    activeApiKeys: apiKeyRows.filter((k) => !k.revoked).length,
    published: publishRows.filter((p) => p.status === "published").length,
    failedJobs,
    openTickets,
    revenueTotal: billingRows.filter((b) => b.type === "payment" && b.status === "completed").reduce((s, b) => s + Number(b.amount), 0),
    planMix: profileRows.reduce((acc: Record<string, number>, p) => {
      acc[p.plan] = (acc[p.plan] ?? 0) + 1;
      return acc;
    }, {}),
    alerts,
  });
}
