/**
 * GET /api/publishing/status  — recent per-destination publish results for this
 * user (drives the calendar + activity views). Owner-scoped via RLS.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  let q = supabase
    .from("publish_job_destinations")
    .select("id, job_id, content_type, destination, status, external_url, scheduled_for, published_at, error, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (jobId) q = q.eq("job_id", jobId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ destinations: data ?? [] });
}
