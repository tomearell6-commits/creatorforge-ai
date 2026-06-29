import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/seo-audit/report?id= — full stored report + issues + fix plan (owner-only). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { data: audit } = await supabase.from("seo_audits").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: report }, { data: issues }, { data: fixPlan }] = await Promise.all([
    supabase.from("seo_audit_reports").select("report_json, summary").eq("audit_id", id).maybeSingle(),
    supabase.from("seo_audit_issues").select("issue_type, severity, title, description, recommended_fix, affected_url, status").eq("audit_id", id),
    supabase.from("seo_audit_fix_plans").select("plan_json, created_at").eq("audit_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return NextResponse.json({ audit, report: report?.report_json ?? null, summary: report?.summary ?? null, issues: issues ?? [], fixPlan: fixPlan?.plan_json ?? null });
}
