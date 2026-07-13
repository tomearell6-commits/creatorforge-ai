/**
 * GET /api/local-business/posts/status  — posts for the Publishing Queue +
 * Content Calendar (optionally ?locationId=). Free.
 * PATCH — edit a saved post (free).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locationId = new URL(request.url).searchParams.get("locationId");
  let q = supabase
    .from("local_business_posts")
    .select("id, location_id, post_type, topic, main_text, short_text, cta, image_url, status, publish_at, timezone, credits_used, created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (locationId) q = q.eq("location_id", locationId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as { postId?: string; main_text?: string; short_text?: string; cta?: string; status?: string };
  if (!b.postId) return NextResponse.json({ error: "postId is required." }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b.main_text !== undefined) patch.main_text = b.main_text;
  if (b.short_text !== undefined) patch.short_text = b.short_text;
  if (b.cta !== undefined) patch.cta = b.cta;
  if (b.status !== undefined) patch.status = b.status;
  const { error } = await supabase.from("local_business_posts").update(patch).eq("id", b.postId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
