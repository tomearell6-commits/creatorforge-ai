/**
 * GET  /api/local-business/automation  — list this user's automation rules
 * POST /api/local-business/automation  — create/toggle a rule. Free.
 * Modes: manual / assisted (default) / autopilot. Autopilot must be opted into
 * explicitly (enabled=true only when the user turns it on).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LB_DEFAULT_AUTOMATION_MODE, LB_AUTOMATION_RULE_TYPES, type LbAutomationMode } from "@/config/localBusiness";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("local_business_automation_rules").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ rules: data ?? [], defaultMode: LB_DEFAULT_AUTOMATION_MODE, ruleTypes: LB_AUTOMATION_RULE_TYPES });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as { id?: string; locationId?: string; name?: string; mode?: LbAutomationMode; ruleType?: string; enabled?: boolean };
  const mode: LbAutomationMode = b.mode === "manual" || b.mode === "autopilot" ? b.mode : "assisted";
  // Autopilot is high-risk: only enable when explicitly requested.
  const enabled = mode === "autopilot" ? b.enabled === true : (b.enabled ?? false);

  const row = { user_id: user.id, location_id: b.locationId ?? null, name: b.name ?? "Automation rule", mode, rule_type: b.ruleType ?? null, enabled };
  const res = b.id
    ? await supabase.from("local_business_automation_rules").update(row).eq("id", b.id).select("id").single()
    : await supabase.from("local_business_automation_rules").insert(row).select("id").single();
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ id: res.data.id, mode, enabled });
}
