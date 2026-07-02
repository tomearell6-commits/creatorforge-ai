import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import type { DesignLayerData } from "@/lib/design/types";

export const dynamic = "force-dynamic";

/**
 * GET  /api/design/versions?project=ID  -> saved snapshots (newest first)
 * POST /api/design/versions             -> save a version snapshot
 *      body: { projectId, label?, layers: DesignLayerData[], thumbnailUrl? }
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const project = new URL(request.url).searchParams.get("project");
  if (!project) return apiError("project is required", 400);

  const { data, error } = await supabase
    .from("design_versions")
    .select("id, version_number, label, thumbnail_url, created_at")
    .eq("project_id", project)
    .eq("user_id", user.id)
    .order("version_number", { ascending: false });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ versions: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ projectId?: string; label?: string; layers?: DesignLayerData[]; thumbnailUrl?: string }>(request);
  if (!body?.projectId || !Array.isArray(body.layers)) return apiError("projectId and layers are required", 400);

  const { data: project } = await supabase
    .from("design_projects").select("id").eq("id", body.projectId).eq("user_id", user.id).maybeSingle();
  if (!project) return apiError("Not found", 404);

  const { data: last } = await supabase
    .from("design_versions").select("version_number")
    .eq("project_id", body.projectId).order("version_number", { ascending: false }).limit(1).maybeSingle();
  const versionNumber = (last?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("design_versions")
    .insert({
      project_id: body.projectId, user_id: user.id, version_number: versionNumber,
      label: body.label ?? `Version ${versionNumber}`, layers_json: body.layers, thumbnail_url: body.thumbnailUrl ?? null,
    })
    .select("id, version_number, label, created_at")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ version: data }, { status: 201 });
}
