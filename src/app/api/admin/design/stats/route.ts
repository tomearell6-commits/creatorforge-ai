import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** GET /api/admin/design/stats — Design Studio platform metrics for admins. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const countAll = async (table: string) => {
    const { count } = await admin.from(table).select("*", { count: "exact", head: true });
    return count ?? 0;
  };

  const [projects, exportsCount, templates, brandKits, footage, failed] = await Promise.all([
    countAll("design_projects"),
    countAll("design_exports"),
    countAll("design_templates"),
    countAll("brand_design_kits"),
    countAll("video_graphic_concepts"),
    admin.from("design_generation_jobs").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);
  const failedJobs = failed.count ?? 0;

  // Sum of credits used across design generation jobs.
  const { data: creditRows } = await admin.from("design_generation_jobs").select("credits_used");
  const creditsUsed = (creditRows ?? []).reduce((n, r) => n + (r.credits_used ?? 0), 0);

  return NextResponse.json({
    ok: true,
    stats: { projects, exports: exportsCount, templates, brandKits, footageConcepts: footage, failedJobs, creditsUsed },
  });
}
