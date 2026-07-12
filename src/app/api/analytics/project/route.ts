/**
 * GET /api/analytics/project?projectType=&projectId=
 * Honest per-project Analyze data: publishing success + promotion activity from
 * OUR data (real today), plus the content type's analytics sources flagged live
 * vs provider-gated. Platform metrics (views/reach/…) are marked unavailable
 * rather than invented. Owner-scoped via RLS.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkflow } from "@/config/workflowCapabilities";
import type { ContentTypeId } from "@/config/publishingCapabilities";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectType = searchParams.get("projectType") as ContentTypeId | null;
  const projectId = searchParams.get("projectId");
  if (!projectType || !projectId) return NextResponse.json({ error: "projectType and projectId are required." }, { status: 400 });

  const wf = getWorkflow(projectType);

  // Publishing outcomes from our own events feed (ref_id = the project).
  const { data: events } = await supabase
    .from("publishing_events")
    .select("event_type, status, platform, created_at")
    .eq("ref_id", projectId)
    .order("created_at", { ascending: false });

  const publishing = {
    published: (events ?? []).filter((e) => e.event_type === "publish.success").length,
    scheduled: (events ?? []).filter((e) => e.event_type === "schedule.created").length,
    packages: (events ?? []).filter((e) => e.event_type === "export.ready").length,
    failed: (events ?? []).filter((e) => e.event_type === "publish.failed").length,
  };

  const { count: promotions } = await supabase
    .from("promotion_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("source_id", projectId);

  const totalPublish = publishing.published + publishing.scheduled + publishing.failed;
  const status = (events?.length ?? 0) === 0
    ? "collecting_data"
    : (wf?.analyticsSources.some((s) => !s.live) ? "limited_data" : "report_ready");

  // Simple, honest recommendation (no invented metrics).
  const recommendations: string[] = [];
  if (publishing.failed > 0) recommendations.push(`${publishing.failed} destination(s) failed — retry or reconnect the account.`);
  if (publishing.packages > 0) recommendations.push(`${publishing.packages} export package(s) are ready to post manually. Connect those platforms to auto-publish.`);
  if (totalPublish === 0 && publishing.packages === 0) recommendations.push("Not published yet — head to the Publish step to go live or schedule.");
  if ((promotions ?? 0) === 0) recommendations.push("No promotion yet — a quick ad or social campaign can extend reach.");

  return NextResponse.json({
    status,
    publishing,
    promotions: promotions ?? 0,
    sources: wf?.analyticsSources ?? [],
    recommendations,
    recentEvents: (events ?? []).slice(0, 8),
  });
}
