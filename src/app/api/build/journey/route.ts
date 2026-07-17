/**
 * GET /api/build/journey — progress for the guided Build (website/app) journey.
 *
 * Returns per-step completion from the user's REAL projects plus whether the AI
 * generator is live. Drives the step-by-step stepper on the Build Studio
 * overview so users can see exactly where they are in the flow.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { willUseRealBuildAI } from "@/lib/build/generate";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const head = { count: "exact" as const, head: true };
  const [projects, generated] = await Promise.all([
    supabase.from("build_projects").select("id", head).eq("user_id", user.id),
    supabase.from("build_projects").select("id", head).eq("user_id", user.id).eq("status", "generated"),
  ]);

  return NextResponse.json({
    providers: { ai: willUseRealBuildAI() },
    counts: { projects: projects.count ?? 0, generated: generated.count ?? 0 },
  });
}
