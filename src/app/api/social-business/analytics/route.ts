/**
 * GET /api/social-business/analytics
 * Honest cross-platform analytics: our own data (posts, scheduled, campaigns,
 * variations, replies) is real; platform metrics (reach/impressions/views/…) are
 * marked UNAVAILABLE until each provider's analytics API is approved. Never faked.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const head = (t: string) => supabase.from(t).select("id", { count: "exact", head: true });
  const [published, scheduled, campaigns, variations, replies] = await Promise.all([
    supabase.from("social_publish_jobs").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("social_publish_jobs").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    head("social_campaigns"),
    head("social_content_variations"),
    head("social_reply_drafts"),
  ]);

  const own = [
    { id: "published", label: "Posts published", value: published.count ?? 0, available: true, estimated: false },
    { id: "scheduled", label: "Posts scheduled", value: scheduled.count ?? 0, available: true, estimated: false },
    { id: "campaigns", label: "Campaigns", value: campaigns.count ?? 0, available: true, estimated: false },
    { id: "content", label: "Content variations", value: variations.count ?? 0, available: true, estimated: false },
    { id: "replies", label: "Reply drafts", value: replies.count ?? 0, available: true, estimated: false },
  ];
  const gated = ["Reach", "Impressions", "Views", "Clicks", "Engagement", "Followers", "Video completion"]
    .map((label) => ({ id: label.toLowerCase().replace(/\s+/g, "_"), label, value: null, available: false, estimated: false }));

  return NextResponse.json({ own, gated });
}
