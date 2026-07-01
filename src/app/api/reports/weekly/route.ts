import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWeeklyReport, weekRange } from "@/lib/reports/weekly";

/**
 * GET /api/reports/weekly
 * Returns the user's most recent SAVED weekly report. If none exists yet,
 * builds one live for the most recently completed week (weekRange(0)) and
 * returns it unsaved — persisting reports is the cron's job (RLS blocks user
 * inserts). Response: { report, saved }.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: saved, error } = await supabase
    .from("weekly_usage_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (saved) return NextResponse.json({ report: saved, saved: true });

  const { start, end } = weekRange(0);
  const report = await buildWeeklyReport(supabase, user.id, start, end);
  return NextResponse.json({ report, saved: false });
}
