import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/seo-audit/history — the user's past audits. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase.from("seo_audits")
    .select("id, website_url, audit_type, status, overall_score, credits_used, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  return NextResponse.json({ audits: data ?? [] });
}
