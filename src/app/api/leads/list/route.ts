import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { guardLead } from "@/lib/leads/access";

/** GET /api/leads/list?campaignId=&status=&limit= — the user's leads, newest first (cap 500). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const gate = await guardLead(supabase, user.id, !!user.email_confirmed_at, "view");
  if (gate instanceof NextResponse) return gate;

  const params = new URL(request.url).searchParams;
  const campaignId = params.get("campaignId");
  const status = params.get("status");
  const limit = Math.min(500, Math.max(1, Number(params.get("limit")) || 500));

  let q = supabase.from("leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
  if (campaignId) q = q.eq("campaign_id", campaignId);
  if (status) q = q.eq("lead_status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ leads: data ?? [] });
}
