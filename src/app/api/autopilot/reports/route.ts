import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance } from "@/lib/credits";
import { buildReport } from "@/lib/autopilot/reports";

/** GET /api/autopilot/reports?period=daily|weekly|monthly */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const periodParam = new URL(request.url).searchParams.get("period");
  const period = (["daily", "weekly", "monthly"].includes(periodParam ?? "") ? periodParam : "weekly") as "daily" | "weekly" | "monthly";

  const { data: jobs } = await supabase.from("autopilot_jobs")
    .select("title, status, content_type, destination, credits_used, scheduled_time, published_time, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(500);

  const report = buildReport(period, jobs ?? [], await getCreditBalance());
  return NextResponse.json({ report });
}
