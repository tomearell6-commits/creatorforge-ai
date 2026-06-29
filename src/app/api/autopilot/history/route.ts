import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/autopilot/history — recent automation actions for the user. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("autopilot_history")
    .select("id, campaign_id, job_id, action, detail, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ history: data ?? [] });
}
