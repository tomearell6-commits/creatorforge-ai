import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Tutorial progress. Watching is always FREE — this only records position and
 * completion so "Continue watching" and completion badges work.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("tutorial_progress")
    .select("tutorial_id, watched_seconds, completed_at, updated_at")
    .eq("user_id", user.id);
  return NextResponse.json({ progress: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tutorialId, watchedSeconds, completed } = await req.json().catch(() => ({}));
  if (typeof tutorialId !== "string") return NextResponse.json({ error: "tutorialId required" }, { status: 400 });

  const row: Record<string, unknown> = {
    user_id: user.id,
    tutorial_id: tutorialId,
    updated_at: new Date().toISOString(),
  };
  if (typeof watchedSeconds === "number" && watchedSeconds >= 0) row.watched_seconds = Math.floor(watchedSeconds);
  if (completed === true) row.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from("tutorial_progress")
    .upsert(row, { onConflict: "user_id,tutorial_id" });
  if (error) return NextResponse.json({ error: "Could not save progress." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
