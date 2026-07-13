/**
 * GET   /api/social-business/content/variations?projectId=  — list variations
 * PATCH /api/social-business/content/variations             — edit one variation (free)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  const { data } = await supabase.from("social_content_variations").select("*").eq("project_id", projectId).order("created_at", { ascending: true });
  return NextResponse.json({ variations: data ?? [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { id?: string; caption?: string; body?: string; cta?: string; image_url?: string; status?: string };
  if (!b.id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  for (const k of ["caption", "body", "cta", "image_url", "status"] as const) if (b[k] !== undefined) patch[k] = b[k];
  const { error } = await supabase.from("social_content_variations").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
