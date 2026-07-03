import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { generateBuildPackage, willUseRealBuildAI } from "@/lib/build/generate";
import { BUILD_CREDIT_COSTS, BUILD_CREDIT_REASONS, getBuildTypeBySlug } from "@/config/buildStudio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/build/generate { projectId } — generate the FULL project package
 * in one batched AI call and persist it across the normalized tables.
 * 20 credits when real AI succeeds; placeholder runs are free (402 pre-check).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ projectId?: string }>(request);
  if (!body?.projectId) return apiError("projectId is required", 400);

  const { data: project } = await supabase
    .from("build_projects").select("*").eq("id", body.projectId).eq("user_id", user.id).maybeSingle();
  if (!project) return apiError("Project not found", 404);
  if (!project.idea?.trim()) return apiError("The project needs an idea description first.", 400);

  const cost = BUILD_CREDIT_COSTS.fullPackage;
  const billable = willUseRealBuildAI();
  if (billable) {
    const balance = await getCreditBalance();
    if (balance < cost) {
      return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    }
  }

  const typeName = getBuildTypeBySlug(project.project_type ?? "")?.name ?? project.project_type ?? "Website";
  const { pkg, usedAI } = await generateBuildPackage({
    projectType: typeName, group: project.category ?? "website", idea: project.idea,
    targetAudience: project.target_audience ?? undefined, goal: project.goal ?? undefined, style: project.style ?? undefined,
  });

  let creditsUsed = 0;
  if (usedAI && cost > 0) {
    const newBalance = await deductCredits(cost, BUILD_CREDIT_REASONS.fullPackage);
    if (newBalance === null) return apiError("Insufficient credits", 402, { code: "insufficient_credits" });
    creditsUsed = cost;
  }

  // Persist: package on the project + normalized rows (replace-in-place).
  await supabase.from("build_projects").update({
    package_json: pkg, status: "generated",
    credits_used: (project.credits_used ?? 0) + creditsUsed, updated_at: new Date().toISOString(),
  }).eq("id", project.id).eq("user_id", user.id);

  await supabase.from("build_project_pages").delete().eq("project_id", project.id).eq("user_id", user.id);
  if (pkg.pages.length) {
    await supabase.from("build_project_pages").insert(pkg.pages.map((p, i) => ({
      project_id: project.id, user_id: user.id, page_name: p.pageName, purpose: p.purpose,
      sections: p.sections, copy_json: p.copy, sort_order: i,
    })));
  }
  await supabase.from("build_project_features").delete().eq("project_id", project.id).eq("user_id", user.id);
  if (pkg.features.length) {
    await supabase.from("build_project_features").insert(pkg.features.map((f, i) => ({
      project_id: project.id, user_id: user.id, name: f.name, description: f.description,
      priority: f.priority, phase: f.phase, sort_order: i,
    })));
  }
  await supabase.from("build_project_roadmaps").upsert(
    { project_id: project.id, user_id: user.id, roadmap_json: pkg.roadmap }, { onConflict: "project_id" });
  await supabase.from("build_marketing_plans").upsert(
    { project_id: project.id, user_id: user.id, plan_json: pkg.marketingPlan }, { onConflict: "project_id" });
  await supabase.from("build_app_specs").upsert(
    {
      project_id: project.id, user_id: user.id,
      spec_json: { databaseSuggestion: pkg.databaseSuggestion, techStack: pkg.techStack, uiComponentPlan: pkg.uiComponentPlan, userFlow: pkg.userFlow },
    },
    { onConflict: "project_id" });

  return NextResponse.json({ package: pkg, usedAI, creditsUsed });
}
