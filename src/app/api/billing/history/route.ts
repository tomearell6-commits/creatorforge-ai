import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/billing/history — billing events, newest first. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: events } = await supabase
    .from("billing_history")
    .select("id, event_type, description, amount_usd, plan_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json({ events: events ?? [] });
}
