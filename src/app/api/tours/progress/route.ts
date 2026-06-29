import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTour } from "@/lib/tours/tours";

/** GET — the user's tour progress (so completed tours don't auto-repeat). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase.from("user_tour_progress")
    .select("tour_id, current_step, completed, skipped").eq("user_id", user.id);
  return NextResponse.json({ progress: data ?? [] });
}

/**
 * POST { tourId, currentStep?, completed?, skipped? } — upsert progress.
 * Guided tours never cost credits; this only persists progress.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as { tourId?: string; currentStep?: number; completed?: boolean; skipped?: boolean };
  if (!b.tourId || !getTour(b.tourId)) return NextResponse.json({ error: "Unknown tour." }, { status: 400 });

  const { error } = await supabase.from("user_tour_progress").upsert({
    user_id: user.id,
    tour_id: b.tourId,
    current_step: Math.max(0, b.currentStep ?? 0),
    completed: !!b.completed,
    skipped: !!b.skipped,
    completed_at: b.completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,tour_id" });
  if (error) return NextResponse.json({ error: "Could not save progress." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
