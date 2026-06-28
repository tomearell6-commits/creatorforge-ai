import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

/**
 * Admin analytics (Phase 6 — Module 8). Platform-wide stats. Gated to
 * ADMIN_EMAILS; uses the service-role client to read across all users.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [profiles, subs, publishHistory, renderJobs, creditUsage, assets, events] = await Promise.all([
    admin.from("profiles").select("plan, credits"),
    admin.from("subscriptions").select("plan, status"),
    admin.from("publish_history").select("status"),
    admin.from("render_jobs").select("status"),
    admin.from("credit_usage").select("amount"),
    admin.from("assets").select("size_bytes"),
    admin.from("analytics_events").select("event_type"),
  ]);

  const profileRows = profiles.data ?? [];
  const activeSubs = (subs.data ?? []).filter((s) => s.status === "active");
  const mrr = activeSubs.reduce((sum, s) => {
    // Approximate MRR from plan credit tiers' list prices.
    const price = { free: 0, creator: 19, pro: 49, agency: 149 }[s.plan as string] ?? 0;
    return sum + price;
  }, 0);
  const publishRows = publishHistory.data ?? [];
  const renderRows = renderJobs.data ?? [];

  return NextResponse.json({
    totalUsers: profileRows.length,
    activeSubscriptions: activeSubs.length,
    mrr,
    creditsConsumed: (creditUsage.data ?? []).reduce((s, c) => s + Math.abs(c.amount ?? 0), 0),
    creditsOutstanding: profileRows.reduce((s, p) => s + (p.credits ?? 0), 0),
    publishedVideos: publishRows.filter((p) => p.status === "published").length,
    failedJobs:
      publishRows.filter((p) => p.status === "failed").length +
      renderRows.filter((r) => r.status === "failed").length,
    renders: renderRows.length,
    storageBytes: (assets.data ?? []).reduce((s, a) => s + (a.size_bytes ?? 0), 0),
    apiEvents: (events.data ?? []).length,
    planMix: profileRows.reduce((acc: Record<string, number>, p) => {
      acc[p.plan as string] = (acc[p.plan as string] ?? 0) + 1;
      return acc;
    }, {}),
    // Trivial health signal: failed vs total jobs.
    health: renderRows.length + publishRows.length === 0 ? "idle" : "ok",
  });
}
