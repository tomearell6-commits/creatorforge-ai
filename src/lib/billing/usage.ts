/**
 * Usage analytics — aggregates the authoritative credit_usage log into the
 * category/trend shapes the Usage page charts render. Also writes the daily
 * usage_statistics rollups (called from the ops cron).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { USAGE_CATEGORIES, usageCategoryFor } from "@/config/billing";

export type UsageReport = {
  totalCredits90d: number;
  byCategory: { id: string; label: string; credits: number }[];
  daily: { day: string; credits: number }[];   // last 30 days
  weekly: { week: string; credits: number }[]; // last 12 weeks (ISO Monday)
  monthly: { month: string; credits: number }[]; // last 6 months
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mondayOf(d: Date): string {
  const copy = new Date(d);
  const dow = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - dow);
  return isoDay(copy);
}

export async function buildUsageReport(userId: string): Promise<UsageReport> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data: rows } = await admin
    .from("credit_usage")
    .select("amount, reason, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(5000);

  const byCat = new Map<string, number>();
  const byDay = new Map<string, number>();
  const byWeek = new Map<string, number>();
  const byMonth = new Map<string, number>();
  let total = 0;

  for (const r of rows ?? []) {
    const amount = Math.max(0, Number(r.amount) || 0);
    if (!amount) continue;
    total += amount;
    const cat = usageCategoryFor(r.reason ?? "");
    byCat.set(cat, (byCat.get(cat) ?? 0) + amount);
    const d = new Date(r.created_at);
    byDay.set(isoDay(d), (byDay.get(isoDay(d)) ?? 0) + amount);
    byWeek.set(mondayOf(d), (byWeek.get(mondayOf(d)) ?? 0) + amount);
    const month = r.created_at.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + amount);
  }

  // Dense daily series (last 30 days, zero-filled) so charts have no gaps.
  const daily: UsageReport["daily"] = [];
  for (let i = 29; i >= 0; i--) {
    const day = isoDay(new Date(Date.now() - i * 864e5));
    daily.push({ day, credits: byDay.get(day) ?? 0 });
  }
  const weekly = [...byWeek.entries()].sort().slice(-12).map(([week, credits]) => ({ week, credits }));
  const monthly = [...byMonth.entries()].sort().slice(-6).map(([month, credits]) => ({ month, credits }));

  return {
    totalCredits90d: total,
    byCategory: USAGE_CATEGORIES
      .map((c) => ({ id: c.id, label: c.label, credits: byCat.get(c.id) ?? 0 }))
      .filter((c) => c.credits > 0)
      .sort((a, b) => b.credits - a.credits),
    daily,
    weekly,
    monthly,
  };
}

/** Roll yesterday's credit_usage into usage_statistics (idempotent upsert). */
export async function rollupDailyUsage(): Promise<number> {
  const admin = createAdminClient();
  const day = isoDay(new Date(Date.now() - 864e5));
  const { data: rows } = await admin
    .from("credit_usage")
    .select("user_id, amount, reason")
    .gte("created_at", `${day}T00:00:00Z`)
    .lt("created_at", `${day}T24:00:00Z`)
    .limit(20000);

  const perUser = new Map<string, { total: number; breakdown: Record<string, number> }>();
  for (const r of rows ?? []) {
    const amount = Math.max(0, Number(r.amount) || 0);
    if (!amount) continue;
    const entry = perUser.get(r.user_id) ?? { total: 0, breakdown: {} };
    entry.total += amount;
    const cat = usageCategoryFor(r.reason ?? "");
    entry.breakdown[cat] = (entry.breakdown[cat] ?? 0) + amount;
    perUser.set(r.user_id, entry);
  }

  for (const [userId, { total, breakdown }] of perUser) {
    await admin.from("usage_statistics").upsert(
      { user_id: userId, day, credits_used: total, breakdown },
      { onConflict: "user_id,day" }
    );
  }
  return perUser.size;
}
