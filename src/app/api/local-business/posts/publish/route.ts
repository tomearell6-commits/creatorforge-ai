/**
 * POST /api/local-business/posts/publish { postId }
 * Publishes a post to Google Business Profile via the real Business Profile API
 * IF live access is configured + approved; otherwise records the attempt as
 * UNAVAILABLE and keeps the post as a draft. NEVER marks a post published
 * without a confirmed provider response. Free (publishing isn't a paid AI action).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gbpApiConfigured } from "@/lib/local-business/service";
import { getValidAccessToken, createLocalPost } from "@/lib/local-business/gbp-api";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = (await request.json().catch(() => ({}))) as { postId?: string };
  if (!postId) return NextResponse.json({ error: "postId is required." }, { status: 400 });

  const { data: post } = await supabase
    .from("local_business_posts")
    .select("id, location_id, status, post_type, main_text, cta, image_url")
    .eq("id", postId).single();
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  // Honest gate: live publishing needs approved Business Profile API access.
  if (!gbpApiConfigured()) {
    await supabase.from("local_business_publish_jobs").insert({ user_id: user.id, post_id: postId, location_id: post.location_id, status: "unavailable", error: "Google Business Profile API not enabled/approved" });
    await supabase.from("local_business_publish_events").insert({ user_id: user.id, post_id: postId, location_id: post.location_id, event_type: "publish.unavailable", status: "unavailable", message: "Live publishing to Google isn't enabled yet." });
    return NextResponse.json({
      published: false, status: "unavailable",
      message: "Your post is saved. Live publishing to Google Business Profile isn't enabled yet (needs approved Business Profile API access). You can copy the post to publish manually, or promote it to your social channels now.",
    });
  }

  // The post's location must be a real, Google-linked location (synced from GBP).
  const { data: location } = await supabase
    .from("local_business_locations")
    .select("id, account_id, provider_location_id, business_name, website, appointment_url")
    .eq("id", post.location_id ?? "").maybeSingle();
  if (!location?.provider_location_id || !location.account_id) {
    return NextResponse.json({
      published: false, status: "unavailable",
      message: "This location isn't linked to a Google Business Profile location yet. Connect Google and sync your locations, then publish from a synced location.",
    });
  }

  const { data: account } = await supabase
    .from("local_business_accounts")
    .select("id, access_token, refresh_token, expires_at")
    .eq("id", location.account_id).maybeSingle();
  if (!account) {
    return NextResponse.json({ published: false, status: "unavailable", message: "Reconnect your Google account for this location, then publish again." });
  }

  const token = await getValidAccessToken(supabase, account);
  if (!token) {
    await supabase.from("local_business_accounts").update({ status: "expired" }).eq("id", account.id);
    return NextResponse.json({ published: false, status: "failed", message: "Google authorization expired — reconnect the account and try again." });
  }

  // Mark in-flight, then attempt the real publish.
  await supabase.from("local_business_posts").update({ status: "publishing", updated_at: new Date().toISOString() }).eq("id", postId);
  const { data: job } = await supabase.from("local_business_publish_jobs")
    .insert({ user_id: user.id, post_id: postId, location_id: location.id, status: "publishing" })
    .select("id").single();

  const result = await createLocalPost(token, {
    providerLocationId: location.provider_location_id,
    postType: post.post_type,
    mainText: post.main_text ?? "",
    cta: post.cta ?? null,
    ctaUrl: location.appointment_url || location.website || null,
    imageUrl: post.image_url ?? null,
  });

  if (result.ok) {
    const now = new Date().toISOString();
    await supabase.from("local_business_posts").update({ status: "published", updated_at: now }).eq("id", postId);
    await supabase.from("local_business_locations").update({ last_post_at: now }).eq("id", location.id);
    if (job?.id) await supabase.from("local_business_publish_jobs").update({ status: "published", external_ref: result.url ?? null, published_at: now }).eq("id", job.id);
    await supabase.from("local_business_publish_events").insert({ user_id: user.id, post_id: postId, location_id: location.id, event_type: "publish.success", status: "published", message: result.url ?? "Published to Google Business Profile" });
    return NextResponse.json({ published: true, status: "published", url: result.url ?? null, message: "Published to your Google Business Profile." });
  }

  await supabase.from("local_business_posts").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", postId);
  if (job?.id) await supabase.from("local_business_publish_jobs").update({ status: "failed", error: result.error ?? "Publish failed" }).eq("id", job.id);
  await supabase.from("local_business_publish_events").insert({ user_id: user.id, post_id: postId, location_id: location.id, event_type: "publish.failed", status: "failed", message: result.error ?? "Publish failed" });
  return NextResponse.json({ published: false, status: "failed", message: result.error ?? "Publishing to Google Business Profile failed." });
}
