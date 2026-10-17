import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSiteDue, startOfUtcDay } from "@/lib/seo/autopost/schedule";

/**
 * SEO Auto-Poster scheduler (Vercel Cron, hourly). Secured by CRON_SECRET.
 *
 * Finds sites whose daily slot has come due, locks each one, and hands every site
 * to its OWN worker invocation (/api/cron/seo-autopost/run) so each article gets a
 * full 5-minute budget and one slow site can't delay the others. At most MAX_PER_TICK
 * sites start per hour; any left over are still due and are picked up next hour.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_PER_TICK = 8;
const CLAIM_TTL_MS = 25 * 60_000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.creatorsforge.io";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: sites, error } = await admin
    .from("seo_autopost_sites")
    .select("id, publish_hours, claimed_at, last_run_at")
    .eq("active", true)
    .limit(500);
  // e.g. the 0046 migration has not been run yet — report it instead of crashing.
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });

  const { data: done } = await admin
    .from("seo_autopost_log").select("site_id")
    .eq("status", "published").gte("created_at", startOfUtcDay(now).toISOString());
  const publishedToday = new Map<string, number>();
  for (const r of done ?? []) publishedToday.set(r.site_id as string, (publishedToday.get(r.site_id as string) ?? 0) + 1);

  const cutoff = now.getTime() - CLAIM_TTL_MS;
  const due = (sites ?? [])
    .filter((s) => !s.claimed_at || new Date(s.claimed_at as string).getTime() < cutoff)
    .filter((s) => isSiteDue({ hours: s.publish_hours as number[], publishedToday: publishedToday.get(s.id as string) ?? 0, now }))
    // least-recently-run first so nobody starves when there are many sites
    .sort((a, b) => (new Date((a.last_run_at as string) ?? 0).getTime()) - (new Date((b.last_run_at as string) ?? 0).getTime()))
    .slice(0, MAX_PER_TICK);

  // Lock each site (atomic: only one tick can win the claim).
  const claimed: string[] = [];
  for (const s of due) {
    const { data } = await admin
      .from("seo_autopost_sites")
      .update({ claimed_at: now.toISOString() })
      .eq("id", s.id)
      .or(`claimed_at.is.null,claimed_at.lt.${new Date(cutoff).toISOString()}`)
      .select("id");
    if (data && data.length) claimed.push(s.id as string);
  }

  const results = await Promise.allSettled(
    claimed.map((id) =>
      fetch(`${APP_URL}/api/cron/seo-autopost/run?site=${encodeURIComponent(id)}`, {
        headers: { authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(290_000),
      }).then((r) => r.json().catch(() => ({})))
    )
  );

  return NextResponse.json({
    ok: true,
    activeSites: sites?.length ?? 0,
    due: due.length,
    started: claimed.length,
    outcomes: results.map((r) => (r.status === "fulfilled" ? r.value : { error: "worker did not respond in time" })),
  });
}
