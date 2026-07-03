import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/**
 * GET /api/design/realestate/outputs?project=ID
 * All saved AI outputs for a real-estate project the user owns (newest first),
 * so past concepts can be re-opened from My Projects without regenerating.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const project = new URL(request.url).searchParams.get("project");
  if (!project) return apiError("project is required", 400);

  const { data, error } = await supabase
    .from("real_estate_design_outputs")
    .select("id, output_type, concept_json, used_ai, credits_used, created_at")
    .eq("project_id", project)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return apiError(error.message, 500);

  return NextResponse.json({ outputs: data ?? [] });
}
