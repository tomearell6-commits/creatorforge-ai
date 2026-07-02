import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/** GET /api/design/projects/[id] -> a project plus its ordered layers. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: project, error } = await supabase
    .from("design_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return apiError(error.message, 500);
  if (!project) return apiError("Not found", 404);

  const { data: layers } = await supabase
    .from("design_layers")
    .select("*")
    .eq("project_id", id)
    .eq("user_id", user.id)
    .order("z_index", { ascending: true });

  return NextResponse.json({ project, layers: layers ?? [] });
}
