/**
 * GET /api/social-business/publish/status — publish jobs for the Publishing Queue
 * + Calendar (per-platform, independent). Free.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("social_publish_jobs")
    .select("id, project_id, campaign_id, platform, status, external_url, error, scheduled_for, published_at, retry_count, created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}
