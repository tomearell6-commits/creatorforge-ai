import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET — the user's saved ad creatives (Creative Library). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const includeArchived = new URL(request.url).searchParams.get("archived") === "1";
  let q = supabase.from("ad_creatives")
    .select("id, campaign_id, headline, primary_text, description, cta, hashtags, image_url, video_url, variant_label, archived, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
  if (!includeArchived) q = q.eq("archived", false);
  const { data } = await q;
  return NextResponse.json({ creatives: data ?? [] });
}

/** PATCH { id, archived } — archive/unarchive. */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { id?: string; archived?: boolean };
  if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const { error } = await supabase.from("ad_creatives").update({ archived: !!b.archived }).eq("id", b.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** DELETE ?id= */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await supabase.from("ad_creatives").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
