/**
 * POST /api/local-business/posts/publish { postId }
 * Publishes a post to Google Business Profile IF live API access is configured
 * + approved; otherwise records the attempt as UNAVAILABLE and keeps the post as
 * a draft. NEVER marks a post published without provider confirmation. Free
 * (publishing isn't a paid AI action).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gbpApiConfigured } from "@/lib/local-business/service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = (await request.json().catch(() => ({}))) as { postId?: string };
  if (!postId) return NextResponse.json({ error: "postId is required." }, { status: 400 });

  const { data: post } = await supabase.from("local_business_posts").select("id, location_id, status").eq("id", postId).single();
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  if (!gbpApiConfigured()) {
    await supabase.from("local_business_publish_jobs").insert({ user_id: user.id, post_id: postId, location_id: post.location_id, status: "unavailable", error: "Google Business Profile API not enabled/approved" });
    await supabase.from("local_business_publish_events").insert({ user_id: user.id, post_id: postId, location_id: post.location_id, event_type: "publish.unavailable", status: "unavailable", message: "Live publishing to Google isn't enabled yet." });
    return NextResponse.json({
      published: false, status: "unavailable",
      message: "Your post is saved. Live publishing to Google Business Profile isn't enabled yet (needs approved Business Profile API access). You can copy the post to publish manually, or promote it to your social channels now.",
    });
  }

  // When live GBP publishing is implemented, real provider call goes here and we
  // only set status='published' on confirmed success. Until then, we do not fake it.
  await supabase.from("local_business_publish_jobs").insert({ user_id: user.id, post_id: postId, location_id: post.location_id, status: "pending" });
  return NextResponse.json({ published: false, status: "pending", message: "Publishing is being processed." });
}
