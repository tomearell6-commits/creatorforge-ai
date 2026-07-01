import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";

/**
 * Content Calendar feed (Phase 6 — Module 3).
 * GET  -> scheduled posts joined with their job (title/project) for the calendar.
 * PATCH { id, scheduledAt } -> reschedule a post (drag-and-drop on the calendar).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*, publish_jobs(title, project_id)")
    .order("scheduled_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJsonBody<{ id?: string; scheduledAt?: string }>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  const { id, scheduledAt } = body;
  if (!id || !scheduledAt) return NextResponse.json({ error: "id and scheduledAt required" }, { status: 400 });

  const { data, error } = await supabase
    .from("scheduled_posts")
    .update({ scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep the parent job's scheduled_at in sync when it has a single target.
  if (data?.publish_job_id) {
    await supabase.from("publish_jobs").update({ scheduled_at: scheduledAt }).eq("id", data.publish_job_id);
  }
  return NextResponse.json({ post: data });
}
