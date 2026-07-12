/**
 * GET /api/promotion/status — this user's promotion campaigns + their jobs.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: campaigns, error } = await supabase
    .from("promotion_campaigns")
    .select("id, content_type, title, objective, status, budget, currency, country, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (campaigns ?? []).map((c) => c.id);
  const { data: jobs } = ids.length
    ? await supabase.from("promotion_jobs").select("id, campaign_id, ad_platform, status, export_package").in("campaign_id", ids)
    : { data: [] as unknown[] };

  return NextResponse.json({ campaigns: campaigns ?? [], jobs: jobs ?? [] });
}
