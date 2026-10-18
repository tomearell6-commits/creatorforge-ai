import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/admin";
import { apiError } from "@/lib/api/respond";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { queryAnalytics } from "@/lib/gsc/google";
import { resolveProperty } from "@/lib/gsc/resolve";
import { listSites } from "@/lib/gsc/sites";
import { dateRange } from "@/lib/gsc/overview";
import { findQuickWins } from "@/lib/gsc/quickwins";

/**
 * GET /api/seo/gsc/quickwins?host=example.com&days=28
 * Pages Google already shows that could earn more clicks, from Google's own numbers. Free to look.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const rl = await limitRequestAsync(request, "gsc-quickwins", 20, 60_000);
  if (!rl.ok) return apiError("Too many requests. Please wait a minute.", 429);

  const url = new URL(request.url);
  const host = (url.searchParams.get("host") ?? "").toLowerCase();
  const range = dateRange(Number(url.searchParams.get("days")) || 28);

  const admin = await isPlatformAdmin();
  const sites = await listSites(supabase, admin.ok);
  const site = sites.find((s) => s.host === host);
  if (!site) return apiError("That website is not one of your Autopilot sites.", 404);

  const r = await resolveProperty(createAdminClient(), user.id, host);
  if (r.state !== "ok") return NextResponse.json({ ...r });

  const [pages, pageQueries] = await Promise.all([
    queryAnalytics(r.token, r.property, { startDate: range.start, endDate: range.end, dimensions: ["page"], rowLimit: 1000 }),
    queryAnalytics(r.token, r.property, { startDate: range.start, endDate: range.end, dimensions: ["page", "query"], rowLimit: 2500 }),
  ]);
  if (!pages.ok) return NextResponse.json({ state: "error", message: `Google Search Console said: ${pages.message}` });
  const wins = findQuickWins(pages.data.rows, pageQueries.ok ? pageQueries.data.rows : undefined);
  // The blog's own pages can be changed in one click (platform owner only).
  return NextResponse.json({ state: "ok", range, wins, canApply: site.kind === "blog" && admin.ok, free: site.kind === "blog" });
}
