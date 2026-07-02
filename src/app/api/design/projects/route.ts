import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getDesignFormat } from "@/config/designStudio";
import { blankCanvas } from "@/lib/design/layers";

export const dynamic = "force-dynamic";

/**
 * GET    /api/design/projects?status=  -> list the user's design projects
 * POST   /api/design/projects          -> create a project (+ starter background layer)
 * PATCH  /api/design/projects          -> update a project the user owns
 * DELETE /api/design/projects          -> delete a project the user owns
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("design_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ projects: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{
    title?: string; category?: string; format?: string; style?: string;
    goal?: string; width?: number; height?: number; brandKitId?: string; templateId?: string;
  }>(request);
  if (!body) return apiError("Invalid JSON body", 400);

  const fmt = getDesignFormat(body.format || "square-1-1");
  const width = body.width ?? fmt.width;
  const height = body.height ?? fmt.height;

  const { data: project, error } = await supabase
    .from("design_projects")
    .insert({
      user_id: user.id,
      title: body.title?.trim() || "Untitled design",
      category: body.category ?? null,
      format: body.format ?? fmt.id,
      width, height,
      style: body.style ?? null,
      goal: body.goal ?? null,
      brand_kit_id: body.brandKitId ?? null,
      template_id: body.templateId ?? null,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);

  // Seed a single background layer so the editor always renders something.
  const [bg] = blankCanvas();
  await supabase.from("design_layers").insert({
    project_id: project.id, user_id: user.id,
    layer_type: bg.layerType, layer_name: bg.layerName,
    position_x: bg.positionX, position_y: bg.positionY, width: bg.width, height: bg.height,
    rotation: bg.rotation, opacity: bg.opacity, z_index: bg.zIndex,
    style_json: bg.styleJson, content_json: bg.contentJson, locked: bg.locked, visible: bg.visible,
  });

  return NextResponse.json({ project }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ id?: string; [k: string]: unknown }>(request);
  if (!body?.id) return apiError("id is required", 400);

  const allowed = ["title", "category", "format", "width", "height", "style", "status", "thumbnail_url", "brand_kit_id", "goal", "concept_json"];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in body) patch[k] = body[k];

  const { data, error } = await supabase
    .from("design_projects")
    .update(patch)
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ project: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ id?: string }>(request);
  if (!body?.id) return apiError("id is required", 400);

  const { error } = await supabase
    .from("design_projects")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}
