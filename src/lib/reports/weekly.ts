/**
 * Weekly usage report builder. Aggregates a user's activity for a week window
 * from many source tables, derives rule-based recommendations, and persists the
 * report. Every aggregation is individually guarded — a missing/renamed table
 * yields 0 for that metric rather than failing the whole report. Uses the
 * service-role admin client (cron/on-demand contexts).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { planCredits } from "@/lib/constants";

/** Monday 00:00 UTC of the week containing `d`. */
export function mondayUtc(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = x.getUTCDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7; // days since Monday
  x.setUTCDate(x.getUTCDate() - diff);
  return x;
}

/** [start,end) for a week. weeksAgo=0 → the most recently COMPLETED week (Mon..Sun). */
export function weekRange(weeksAgo = 0): { start: Date; end: Date } {
  const thisMonday = mondayUtc(new Date());
  const end = new Date(thisMonday.getTime() - weeksAgo * 7 * 86400000);
  const start = new Date(end.getTime() - 7 * 86400000);
  return { start, end };
}

export type WeeklyReport = {
  weekStart: string; weekEnd: string;
  creditsUsed: number; creditsRemaining: number; creditsToppedUp: number;
  monthlyCredits: number; purchasedCredits: number; estimatedDaysRemaining: number | null;
  videosCreated: number; seoArticlesCreated: number; adsCreated: number;
  booksCreated: number; chaptersCreated: number; imagesCreated: number; voiceoversCreated: number;
  postsPublished: number; postsScheduled: number; postsFailed: number; upcomingPosts: number;
  automationsActive: number; automationsPaused: number; automationJobsDone: number; automationJobsFailed: number;
  failedJobs: number;
  subscriptionStatus: string; plan: string; renewalDate: string | null;
  prevVideosCreated: number;
  recommendations: string[];
};

/** Count rows in `table` for a user within [start,end) on `tsCol`, with extra eq filters. Returns 0 on any error. */
async function countIn(admin: SupabaseClient, table: string, userId: string, tsCol: string, start: string, end: string, eq: Record<string, string> = {}): Promise<number> {
  try {
    let q = admin.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
    for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
    if (tsCol) q = q.gte(tsCol, start).lt(tsCol, end);
    const { count } = await q;
    return count ?? 0;
  } catch { return 0; }
}

/** Snapshot count (no time window) — e.g. currently active automations. */
async function countNow(admin: SupabaseClient, table: string, userId: string, eq: Record<string, string> = {}): Promise<number> {
  return countIn(admin, table, userId, "", "", "", eq);
}

/** Sum a numeric column with optional filters. Returns 0 on error. */
async function sumIn(admin: SupabaseClient, table: string, col: string, userId: string, tsCol: string, start: string, end: string, opts: { eq?: Record<string, string>; negativeOnly?: boolean } = {}): Promise<number> {
  try {
    let q = admin.from(table).select(col).eq("user_id", userId);
    for (const [k, v] of Object.entries(opts.eq ?? {})) q = q.eq(k, v);
    if (tsCol) q = q.gte(tsCol, start).lt(tsCol, end);
    const { data } = await q;
    if (!data) return 0;
    let total = 0;
    for (const row of data as unknown as Record<string, number>[]) {
      const v = Number(row[col] ?? 0);
      if (opts.negativeOnly && v >= 0) continue;
      total += Math.abs(v);
    }
    return total;
  } catch { return 0; }
}

export async function buildWeeklyReport(admin: SupabaseClient, userId: string, weekStart: Date, weekEnd: Date): Promise<WeeklyReport> {
  const start = weekStart.toISOString();
  const end = weekEnd.toISOString();
  const prevStart = new Date(weekStart.getTime() - 7 * 86400000).toISOString();

  // --- Credits ---
  const [profileRes, walletRes, subRes] = await Promise.all([
    admin.from("profiles").select("credits, plan, full_name").eq("user_id", userId).maybeSingle(),
    admin.from("credit_wallets").select("monthly_credits, purchased_credits, renewal_date").eq("user_id", userId).maybeSingle(),
    admin.from("subscriptions").select("status, plan, current_period_end").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const profile = profileRes.data as { credits?: number; plan?: string; full_name?: string } | null;
  const wallet = walletRes.data as { monthly_credits?: number; purchased_credits?: number; renewal_date?: string } | null;
  const sub = subRes.data as { status?: string; plan?: string; current_period_end?: string } | null;

  const creditsRemaining = profile?.credits ?? 0;
  const plan = sub?.plan ?? profile?.plan ?? "free";
  const creditsUsed = await sumIn(admin, "credit_ledger", "amount", userId, "created_at", start, end, { negativeOnly: true });
  const creditsToppedUp = await sumIn(admin, "credit_purchases", "credits", userId, "created_at", start, end, { eq: { status: "completed" } });

  // --- Content created ---
  const [videosCreated, prevVideosCreated, seoArticlesCreated, adsCreated, booksCreated, chaptersCreated, imagesCreated, voiceoversCreated] = await Promise.all([
    countIn(admin, "render_jobs", userId, "created_at", start, end, { status: "done" }),
    countIn(admin, "render_jobs", userId, "created_at", prevStart, start, { status: "done" }),
    countIn(admin, "seo_articles", userId, "created_at", start, end),
    countIn(admin, "ad_campaigns", userId, "created_at", start, end),
    countIn(admin, "books", userId, "created_at", start, end),
    countIn(admin, "book_chapters", userId, "created_at", start, end),
    countIn(admin, "assets", userId, "created_at", start, end, { type: "image" }),
    countIn(admin, "voiceovers", userId, "created_at", start, end),
  ]);

  // --- Publishing ---
  const [postsPublished, postsFailed, postsScheduled, upcomingPosts] = await Promise.all([
    countIn(admin, "publish_history", userId, "created_at", start, end, { status: "published" }),
    countIn(admin, "publish_history", userId, "created_at", start, end, { status: "failed" }),
    countNow(admin, "scheduled_posts", userId, { status: "scheduled" }),
    (async () => {
      try {
        const now = new Date().toISOString();
        const wk = new Date(Date.now() + 7 * 86400000).toISOString();
        const { count } = await admin.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "scheduled").gte("scheduled_at", now).lt("scheduled_at", wk);
        return count ?? 0;
      } catch { return 0; }
    })(),
  ]);

  // --- Automation ---
  const [automationsActive, automationsPaused, automationJobsDone, automationJobsFailed] = await Promise.all([
    countNow(admin, "autopilot_campaigns", userId, { status: "active" }),
    countNow(admin, "autopilot_campaigns", userId, { status: "paused" }),
    countIn(admin, "autopilot_jobs", userId, "updated_at", start, end, { status: "published" }),
    countIn(admin, "autopilot_jobs", userId, "updated_at", start, end, { status: "failed" }),
  ]);

  const failedJobs = postsFailed + automationJobsFailed;
  const monthlyCredits = wallet?.monthly_credits ?? planCredits(plan);
  const purchasedCredits = wallet?.purchased_credits ?? 0;
  const renewalDate = sub?.current_period_end ?? wallet?.renewal_date ?? null;
  const subscriptionStatus = sub?.status ?? (plan === "free" ? "free" : "active");
  const dailyBurn = creditsUsed / 7;
  const estimatedDaysRemaining = dailyBurn > 0 ? Math.floor(creditsRemaining / dailyBurn) : null;

  // --- Recommendations (rule-based, deterministic) ---
  const recommendations: string[] = [];
  if (estimatedDaysRemaining !== null && estimatedDaysRemaining <= 7) recommendations.push("Your credits may run out soon. Consider topping up before you're interrupted.");
  else if (creditsRemaining === 0) recommendations.push("You're out of credits. Top up to keep generating.");
  if (videosCreated > prevVideosCreated && prevVideosCreated >= 0 && videosCreated > 0) recommendations.push(`You created more videos this week (${videosCreated}) than last week (${prevVideosCreated}). Nice momentum!`);
  if (upcomingPosts > 0) recommendations.push(`You have ${upcomingPosts} scheduled post${upcomingPosts === 1 ? "" : "s"} ready for this week.`);
  if (seoArticlesCreated === 0) recommendations.push("Your SEO Studio hasn't been used recently — a fresh article can bring in steady traffic.");
  if (failedJobs > 0) recommendations.push(`You have ${failedJobs} failed job${failedJobs === 1 ? "" : "s"} that need review.`);
  if (renewalDate) {
    const days = Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000);
    if (days >= 0 && days <= 7) recommendations.push(`Your subscription renews in ${days} day${days === 1 ? "" : "s"}.`);
  }
  if (recommendations.length === 0) recommendations.push("Your account is in good shape. Keep creating!");

  return {
    weekStart: start.slice(0, 10), weekEnd: end.slice(0, 10),
    creditsUsed, creditsRemaining, creditsToppedUp, monthlyCredits, purchasedCredits, estimatedDaysRemaining,
    videosCreated, seoArticlesCreated, adsCreated, booksCreated, chaptersCreated, imagesCreated, voiceoversCreated,
    postsPublished, postsScheduled, postsFailed, upcomingPosts,
    automationsActive, automationsPaused, automationJobsDone, automationJobsFailed, failedJobs,
    subscriptionStatus, plan, renewalDate, prevVideosCreated, recommendations,
  };
}

/** Persist a report (upsert by user+week) and its line items. Returns the report id. */
export async function saveWeeklyReport(admin: SupabaseClient, userId: string, r: WeeklyReport): Promise<string | null> {
  const { data, error } = await admin.from("weekly_usage_reports").upsert({
    user_id: userId, week_start: r.weekStart, week_end: r.weekEnd,
    credits_used: r.creditsUsed, credits_remaining: r.creditsRemaining, credits_topped_up: r.creditsToppedUp,
    videos_created: r.videosCreated, seo_articles_created: r.seoArticlesCreated, ads_created: r.adsCreated,
    books_created: r.booksCreated, posts_published: r.postsPublished, posts_scheduled: r.postsScheduled,
    failed_jobs: r.failedJobs, subscription_status: r.subscriptionStatus, renewal_date: r.renewalDate,
    metrics_json: {
      chapters: r.chaptersCreated, images: r.imagesCreated, voiceovers: r.voiceoversCreated,
      monthlyCredits: r.monthlyCredits, purchasedCredits: r.purchasedCredits, estimatedDaysRemaining: r.estimatedDaysRemaining,
      upcomingPosts: r.upcomingPosts, automationsActive: r.automationsActive, automationsPaused: r.automationsPaused,
      automationJobsDone: r.automationJobsDone, automationJobsFailed: r.automationJobsFailed, prevVideosCreated: r.prevVideosCreated,
    },
    recommendations_json: r.recommendations,
  }, { onConflict: "user_id,week_start" }).select("id").maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}
