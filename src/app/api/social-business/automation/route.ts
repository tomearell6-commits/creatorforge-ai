/**
 * GET  /api/social-business/automation — list rules
 * POST /api/social-business/automation — create/toggle a rule. Free.
 * Modes: manual / assisted (default) / autopilot. Autopilot is opt-in and
 * high-risk paid actions always require final confirmation.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RULE_TYPES = new Set(["weekly_linkedin", "instagram_3x_week", "friday_tiktok", "facebook_after_blog", "pinterest_after_design", "pause_low_credits", "require_ad_approval"]);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("social_automation_rules").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ rules: data ?? [], defaultMode: "assisted" });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as { id?: string; name?: string; mode?: string; ruleType?: string; enabled?: boolean };
  const mode = b.mode === "manual" || b.mode === "autopilot" ? b.mode : "assisted";
  const enabled = mode === "autopilot" ? b.enabled === true : (b.enabled ?? false);
  if (b.ruleType && !RULE_TYPES.has(b.ruleType)) return NextResponse.json({ error: "Unknown rule type." }, { status: 400 });

  const row = { user_id: user.id, name: b.name ?? "Automation rule", mode, rule_type: b.ruleType ?? null, enabled };
  const res = b.id
    ? await supabase.from("social_automation_rules").update(row).eq("id", b.id).select("id").single()
    : await supabase.from("social_automation_rules").insert(row).select("id").single();
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ id: res.data.id, mode, enabled });
}
