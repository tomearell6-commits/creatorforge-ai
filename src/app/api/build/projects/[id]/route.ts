import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/** GET /api/build/projects/[id] — a project with its full generated package + normalized rows. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: project, error } = await supabase
    .from("build_projects").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) return apiError(error.message, 500);
  if (!project) return apiError("Not found", 404);

  const [pages, features, roadmap, marketing, spec] = await Promise.all([
    supabase.from("build_project_pages").select("*").eq("project_id", id).order("sort_order"),
    supabase.from("build_project_features").select("*").eq("project_id", id).order("phase").order("sort_order"),
    supabase.from("build_project_roadmaps").select("roadmap_json").eq("project_id", id).maybeSingle(),
    supabase.from("build_marketing_plans").select("plan_json").eq("project_id", id).maybeSingle(),
    supabase.from("build_app_specs").select("spec_json").eq("project_id", id).maybeSingle(),
  ]);

  return NextResponse.json({
    project,
    pages: pages.data ?? [],
    features: features.data ?? [],
    roadmap: roadmap.data?.roadmap_json ?? null,
    marketing: marketing.data?.plan_json ?? null,
    appSpec: spec.data?.spec_json ?? null,
  });
}
