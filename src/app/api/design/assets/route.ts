import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

const MAX_URL_LEN = 4000;

/**
 * Design assets library (images/backgrounds/uploads used in designs).
 * GET list (filter ?type / ?project) / POST register / DELETE.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const project = searchParams.get("project");

  let query = supabase
    .from("design_assets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (type) query = query.eq("asset_type", type);
  if (project) query = query.eq("project_id", project);

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ assets: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{
    url?: string; assetType?: string; name?: string; projectId?: string;
    prompt?: string; source?: string; mimeType?: string; width?: number; height?: number; bytes?: number;
  }>(request);
  if (!body?.url) return apiError("url is required", 400);

  // Validate the URL: only http(s), reasonable length (guards against data-URI bloat / junk).
  if (body.url.length > MAX_URL_LEN || !/^https?:\/\//i.test(body.url)) {
    return apiError("url must be a valid http(s) link", 400);
  }

  const { data, error } = await supabase
    .from("design_assets")
    .insert({
      user_id: user.id, project_id: body.projectId ?? null, url: body.url,
      asset_type: body.assetType ?? "image", name: body.name ?? null, prompt: body.prompt ?? null,
      source: body.source ?? "upload", mime_type: body.mimeType ?? null,
      width: body.width ?? null, height: body.height ?? null, bytes: body.bytes ?? null,
    })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ asset: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ id?: string }>(request);
  if (!body?.id) return apiError("id is required", 400);

  const { error } = await supabase.from("design_assets").delete().eq("id", body.id).eq("user_id", user.id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}
