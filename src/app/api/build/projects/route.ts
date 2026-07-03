import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/** Build projects CRUD (owner-scoped). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("build_projects")
    .select("id, title, category, project_type, goal, style, status, credits_used, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{
    title?: string; category?: string; projectType?: string; idea?: string;
    targetAudience?: string; goal?: string; style?: string;
  }>(request);
  if (!body?.idea?.trim()) return apiError("idea is required", 400);

  const { data, error } = await supabase
    .from("build_projects")
    .insert({
      user_id: user.id,
      title: body.title?.trim() || body.idea.slice(0, 60),
      category: body.category ?? null, project_type: body.projectType ?? null,
      idea: body.idea, target_audience: body.targetAudience ?? null,
      goal: body.goal ?? null, style: body.style ?? null,
    })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ project: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ id?: string; [k: string]: unknown }>(request);
  if (!body?.id) return apiError("id is required", 400);

  const map: Record<string, string> = {
    title: "title", idea: "idea", targetAudience: "target_audience",
    goal: "goal", style: "style", status: "status", packageJson: "package_json",
  };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, col] of Object.entries(map)) if (k in body) patch[col] = body[k];

  const { data, error } = await supabase
    .from("build_projects").update(patch).eq("id", body.id).eq("user_id", user.id).select("*").single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ project: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ id?: string }>(request);
  if (!body?.id) return apiError("id is required", 400);

  const { error } = await supabase.from("build_projects").delete().eq("id", body.id).eq("user_id", user.id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}
