import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/admin";
import { apiError } from "@/lib/api/respond";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { cacheGet, cacheSet, queryAnalytics } from "@/lib/gsc/google";
import { resolveProperty } from "@/lib/gsc/resolve";
import { articlesFor, listSites } from "@/lib/gsc/sites";
import { articleResults, dailySeries, dateRange, pctChange, totalsFrom, type GscRow } from "@/lib/gsc/overview";

/**
 * GET /api/seo/gsc/overview?host=example.com&days=28[&refresh=1]
 * Real Search Console numbers for one of the user's Autopilot websites, plus how each article is doing.
 * Nothing is estimated: a website that is not in Search Console gets an honest "not set up" answer.
 */
export const maxDuration = 60;
const TTL = 3 * 60 * 60_000;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const rl = await limitRequestAsync(request, "gsc-overview", 40, 60_000);
  if (!rl.ok) return apiError("Too many requests. Please wait a minute.", 429);

  const url = new URL(request.url);
  const host = (url.searchParams.get("host") ?? "").toLowerCase();
  const days = Number(url.searchParams.get("days")) || 28;
  const refresh = url.searchParams.get("refresh") === "1";

  const sites = await listSites(supabase, (await isPlatformAdmin()).ok);
  const site = sites.find((s) => s.host === host);
  if (!site) return apiError("That website is not one of your Autopilot sites.", 404);

  const admin = createAdminClient();
  const range = dateRange(days);
  const cacheKey = `${host}|${range.days}`;
  if (!refresh) {
    const hit = await cacheGet<Record<string, unknown>>(admin, user.id, "overview", cacheKey, TTL);
    if (hit) return NextResponse.json({ ...hit, cached: true });
  }

  const r = await resolveProperty(admin, user.id, host);
  if (r.state !== "ok") return NextResponse.json({ ...r, site });

  const [series, prev, now, queries, pages] = await Promise.all([
    queryAnalytics(r.token, r.property, { startDate: range.start, endDate: range.end, dimensions: ["date"], rowLimit: 100 }),
    queryAnalytics(r.token, r.property, { startDate: range.prevStart, endDate: range.prevEnd }),
    queryAnalytics(r.token, r.property, { startDate: range.start, endDate: range.end }),
    queryAnalytics(r.token, r.property, { startDate: range.start, endDate: range.end, dimensions: ["query"], rowLimit: 25 }),
    queryAnalytics(r.token, r.property, { startDate: range.start, endDate: range.end, dimensions: ["page"], rowLimit: 1000 }),
  ]);
  const failed = [series, prev, now, queries, pages].find((x) => !x.ok);
  if (failed && !failed.ok) {
    const needsApi = /has not been used|is disabled|accessNotConfigured|SERVICE_DISABLED/i.test(failed.message);
    return NextResponse.json({
      state: "error", site,
      message: needsApi
        ? "The Google Search Console API is switched off in your Google Cloud project. Enable it, then reload."
        : `Google Search Console said: ${failed.message}`,
    });
  }
  const rows = (x: typeof now): GscRow[] | undefined => (x.ok ? x.data.rows : undefined);

  const tNow = totalsFrom(rows(now));
  const tPrev = totalsFrom(rows(prev));
  const articles = articleResults(await articlesFor(supabase, admin, site), rows(pages));

  const payload = {
    state: "ok" as const, site, property: r.property, account: r.email, range,
    totals: tNow, previous: tPrev,
    change: { clicks: pctChange(tNow.clicks, tPrev.clicks), impressions: pctChange(tNow.impressions, tPrev.impressions) },
    series: dailySeries(rows(series), range.start, range.end),
    queries: (rows(queries) ?? []).map((q) => ({ query: q.keys?.[0] ?? "", clicks: q.clicks ?? 0, impressions: q.impressions ?? 0, ctr: q.ctr ?? 0, position: Math.round((q.position ?? 0) * 10) / 10 })),
    articles,
    fetchedAt: new Date().toISOString(),
  };
  await cacheSet(admin, user.id, "overview", cacheKey, payload);
  return NextResponse.json(payload);
}
