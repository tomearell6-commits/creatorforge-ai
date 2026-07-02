import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { normalizeZIndex } from "@/lib/design/layers";
import type { DesignLayerData } from "@/lib/design/types";

export const dynamic = "force-dynamic";

/**
 * GET  /api/design/layers?project=ID  -> ordered layers for a project the user owns
 * POST /api/design/layers             -> bulk-replace a project's layers (editor save)
 *      body: { projectId, layers: DesignLayerData[] }
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const project = new URL(request.url).searchParams.get("project");
  if (!project) return apiError("project is required", 400);

  const { data, error } = await supabase
    .from("design_layers")
    .select("*")
    .eq("project_id", project)
    .eq("user_id", user.id)
    .order("z_index", { ascending: true });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ layers: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ projectId?: string; layers?: DesignLayerData[] }>(request);
  if (!body?.projectId || !Array.isArray(body.layers)) return apiError("projectId and layers are required", 400);

  // Confirm ownership before mutating.
  const { data: project } = await supabase
    .from("design_projects")
    .select("id")
    .eq("id", body.projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) return apiError("Not found", 404);

  const layers = normalizeZIndex(body.layers);
  const rows = layers.map((l) => ({
    project_id: body.projectId, user_id: user.id,
    layer_type: l.layerType, layer_name: l.layerName,
    position_x: l.positionX, position_y: l.positionY, width: l.width, height: l.height,
    rotation: l.rotation, opacity: l.opacity, z_index: l.zIndex,
    style_json: l.styleJson ?? {}, content_json: l.contentJson ?? {},
    locked: l.locked ?? false, visible: l.visible ?? true,
  }));

  // Replace-in-place: clear existing, insert the new set.
  const { error: delErr } = await supabase.from("design_layers").delete().eq("project_id", body.projectId).eq("user_id", user.id);
  if (delErr) return apiError(delErr.message, 500);

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("design_layers").insert(rows);
    if (insErr) return apiError(insErr.message, 500);
  }

  await supabase.from("design_projects")
    .update({ status: "edited", updated_at: new Date().toISOString() })
    .eq("id", body.projectId).eq("user_id", user.id);

  return NextResponse.json({ ok: true, count: rows.length });
}
