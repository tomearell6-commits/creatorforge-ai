import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Analytics dashboard feed (Phase 6 — Module 5). Aggregates the user's core
 * tables + analytics_events into summary metrics and a 14-day time series.
 */
function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [projects, assets, publishHistory, renderJobs, creditUsage, events, profile] = await Promise.all([
    supabase.from("projects").select("id, status, created_at"),
    supabase.from("assets").select("type, size_bytes, created_at"),
    supabase.from("publish_history").select("status, platform, created_at"),
    supabase.from("render_jobs").select("status, created_at"),
    supabase.from("credit_usage").select("amount, created_at"),
    supabase.from("analytics_events").select("event_type, value, created_at"),
    supabase.from("profiles").select("plan, credits").eq("user_id", user.id).maybeSingle(),
  ]);

  const assetRows = assets.data ?? [];
  const videoAssets = assetRows.filter((a) => a.type === "video");
  const storageBytes = assetRows.reduce((s, a) => s + (a.size_bytes ?? 0), 0);
  const published = (publishHistory.data ?? []).filter((p) => p.status === "published");
  const creditsConsumed = (creditUsage.data ?? []).reduce((s, c) => s + Math.abs(c.amount ?? 0), 0);
  const views = (events.data ?? []).filter((e) => e.event_type === "view").reduce((s, e) => s + (e.value ?? 0), 0);
  const engagement = (events.data ?? [])
    .filter((e) => e.event_type === "engagement")
    .reduce((s, e) => s + (e.value ?? 0), 0);

  // 14-day series of videos created vs published.
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    days.push(dayKey(new Date(Date.now() - i * 86400000).toISOString()));
  }
  const createdByDay = Object.fromEntries(days.map((d) => [d, 0]));
  const publishedByDay = Object.fromEntries(days.map((d) => [d, 0]));
  for (const v of videoAssets) {
    const k = dayKey(v.created_at);
    if (k in createdByDay) createdByDay[k]++;
  }
  for (const p of published) {
    const k = dayKey(p.created_at);
    if (k in publishedByDay) publishedByDay[k]++;
  }

  // Per-platform published counts.
  const byPlatform: Record<string, number> = {};
  for (const p of published) byPlatform[p.platform] = (byPlatform[p.platform] ?? 0) + 1;

  return NextResponse.json({
    summary: {
      projects: (projects.data ?? []).length,
      videosCreated: videoAssets.length,
      videosPublished: published.length,
      renders: (renderJobs.data ?? []).length,
      creditsConsumed,
      creditsRemaining: profile.data?.credits ?? 0,
      plan: profile.data?.plan ?? "free",
      storageBytes,
      views,
      engagement,
    },
    series: { days, created: days.map((d) => createdByDay[d]), published: days.map((d) => publishedByDay[d]) },
    byPlatform,
  });
}
