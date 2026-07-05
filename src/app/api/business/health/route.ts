import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildHealthReport } from "@/lib/business/health";

/** Business Health Score (0-100, deterministic, explainable factors). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const report = await buildHealthReport(user.id);
  return NextResponse.json(report);
}
