/**
 * POST /api/local-business/posts/schedule { postId, publishAt, timezone }
 * Schedules a post (adds it to the Content Calendar / Publishing Queue). Free.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId, publishAt, timezone } = (await request.json().catch(() => ({}))) as { postId?: string; publishAt?: string; timezone?: string };
  if (!postId || !publishAt || isNaN(Date.parse(publishAt))) return NextResponse.json({ error: "postId and a valid publishAt are required." }, { status: 400 });
  if (Date.parse(publishAt) < Date.now()) return NextResponse.json({ error: "Schedule time must be in the future." }, { status: 400 });

  const { data: post } = await supabase.from("local_business_posts").select("id, location_id").eq("id", postId).single();
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  await supabase.from("local_business_posts").update({ status: "scheduled", publish_at: publishAt, timezone: timezone ?? null, updated_at: new Date().toISOString() }).eq("id", postId);
  await supabase.from("local_business_schedules").insert({ user_id: user.id, post_id: postId, location_id: post.location_id, scheduled_for: publishAt, timezone: timezone ?? null, status: "scheduled" });
  return NextResponse.json({ ok: true, status: "scheduled" });
}
