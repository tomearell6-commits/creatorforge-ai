import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteMedia } from "@/lib/media/storage";

/**
 * GET    /api/assets?type=&project=  -> list the user's assets (filterable).
 * DELETE /api/assets                 -> delete an asset the user owns.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const project = searchParams.get("project");

  let query = supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);
  if (project) query = query.eq("project_id", project);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assets: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Look up the storage path so we can remove the underlying file too.
  const { data: asset } = await supabase
    .from("assets")
    .select("metadata")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase.from("assets").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const path = (asset?.metadata as { path?: string } | null)?.path;
  if (path) await deleteMedia(supabase, path);

  return NextResponse.json({ ok: true });
}
