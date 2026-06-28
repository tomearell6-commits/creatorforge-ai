import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Automation rules (Phase 6 — Module 7).
 * GET  -> list the user's rules.
 * POST -> create a rule (trigger + action + config). Rules are stored for the
 *         automation engine to evaluate; evaluation hooks live alongside the
 *         events that fire them (render complete, publish success, etc.).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("automation_rules")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, trigger, action, conditions, actionConfig } = await request.json();
  if (!name?.trim() || !trigger || !action) {
    return NextResponse.json({ error: "name, trigger and action are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("automation_rules")
    .insert({
      user_id: user.id,
      name: name.trim(),
      trigger,
      action,
      conditions: conditions ?? {},
      action_config: actionConfig ?? {},
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}
