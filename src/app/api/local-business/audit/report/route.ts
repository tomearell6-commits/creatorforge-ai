/**
 * GET /api/local-business/audit/report?auditId=  (or ?locationId= for latest)
 * Returns the audit with its scores, checks, issues, and narrative. Free.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const auditId = searchParams.get("auditId");
  const locationId = searchParams.get("locationId");

  let auditQ = supabase.from("local_business_audits").select("*").order("created_at", { ascending: false }).limit(1);
  if (auditId) auditQ = supabase.from("local_business_audits").select("*").eq("id", auditId).limit(1);
  else if (locationId) auditQ = auditQ.eq("location_id", locationId);
  const { data: audits } = await auditQ;
  const audit = audits?.[0];
  if (!audit) return NextResponse.json({ audit: null });

  const [{ data: checks }, { data: issues }] = await Promise.all([
    supabase.from("local_business_audit_checks").select("category, check_key, label, passed, severity, detail").eq("audit_id", audit.id),
    supabase.from("local_business_audit_issues").select("severity, title, detail, recommendation").eq("audit_id", audit.id),
  ]);
  return NextResponse.json({ audit, checks: checks ?? [], issues: issues ?? [] });
}
