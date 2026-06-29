import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULTS = { default_mode: "manual", retry_limit: 2, pause_on_low_credits: true, low_credit_threshold: 50, email_reports: false };

/** GET /api/autopilot/settings */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("autopilot_settings").select("*").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ settings: data ?? DEFAULTS });
}

/** PUT /api/autopilot/settings */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { error } = await supabase.from("autopilot_settings").upsert({
    user_id: user.id,
    default_mode: b.default_mode ?? DEFAULTS.default_mode,
    retry_limit: Math.max(0, Number(b.retry_limit ?? DEFAULTS.retry_limit)),
    pause_on_low_credits: b.pause_on_low_credits ?? DEFAULTS.pause_on_low_credits,
    low_credit_threshold: Math.max(0, Number(b.low_credit_threshold ?? DEFAULTS.low_credit_threshold)),
    email_reports: b.email_reports ?? DEFAULTS.email_reports,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
