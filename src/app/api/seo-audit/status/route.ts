import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/seo-audit/status?id= — audit status + scores (owner-only via RLS). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { data } = await supabase.from("seo_audits")
    .select("id, status, audit_type, website_url, overall_score, technical_score, content_score, performance_score, mobile_score, indexing_score, ranking_score, credits_used, error, completed_at")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ audit: data });
}
