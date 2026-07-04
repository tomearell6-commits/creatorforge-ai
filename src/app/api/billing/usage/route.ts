import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildUsageReport } from "@/lib/billing/usage";

/** GET /api/billing/usage — 90-day usage analytics for the charts. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await buildUsageReport(user.id);
  return NextResponse.json(report);
}
