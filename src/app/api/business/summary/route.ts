import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildHealthReport } from "@/lib/business/health";
import { getWalletSummary } from "@/lib/credits/wallet";

/** Executive Dashboard payload — every number sourced from real tables. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();

  const [health, wallet, inqToday, inqOpen, drafts, products, scheduled, pendingApprovals, leads7, activity] =
    await Promise.all([
      buildHealthReport(user.id),
      getWalletSummary(),
      admin.from("business_inquiries").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", `${today}T00:00:00Z`),
      admin.from("business_inquiries").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["new", "in_progress"]),
      admin.from("inquiry_replies").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
      admin.from("business_products").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published"),
      admin.from("autopilot_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "scheduled"),
      admin.from("autopilot_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "awaiting_approval"),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since7).then((r) => r, () => ({ count: 0 })),
      admin.from("business_ops_activity").select("action, detail, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    ]);

  return NextResponse.json({
    health: { score: health.score, grade: health.grade, topRecommendations: health.recommendations.slice(0, 3) },
    todayInquiries: inqToday.count ?? 0,
    openInquiries: inqOpen.count ?? 0,
    draftRepliesReady: drafts.count ?? 0,
    productsPublished: products.count ?? 0,
    scheduledPosts: scheduled.count ?? 0,
    pendingApprovals: pendingApprovals.count ?? 0,
    weeklyLeads: (leads7 as { count: number | null }).count ?? 0,
    credits: wallet ? { remaining: wallet.creditsRemaining, plan: wallet.planName } : null,
    recentActivity: activity.data ?? [],
  });
}
