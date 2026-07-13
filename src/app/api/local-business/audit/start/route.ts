/**
 * POST /api/local-business/audit/start { locationId, type: "quick"|"full" }
 * Runs a Profile Health audit on a location's stored data, stores checks/issues
 * + AI narrative, updates the location score. Credit-metered. Owner-scoped.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeLb } from "@/lib/local-business/service";
import { runLocationAudit, generateAuditNarrative, type AuditLocation } from "@/lib/local-business/audit";
import { emitNotification } from "@/lib/notifications";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locationId, type } = (await request.json().catch(() => ({}))) as { locationId?: string; type?: "quick" | "full" };
  if (!locationId) return NextResponse.json({ error: "locationId is required." }, { status: 400 });
  const auditType = type === "quick" ? "quick" : "full";

  const { data: loc } = await supabase.from("local_business_locations").select("*").eq("id", locationId).single();
  if (!loc) return NextResponse.json({ error: "Location not found." }, { status: 404 });

  const charge = await chargeLb(auditType === "quick" ? "quick_audit" : "full_audit");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const [{ count: posts }, { data: reviews }] = await Promise.all([
    supabase.from("local_business_posts").select("id", { count: "exact", head: true }).eq("location_id", locationId),
    supabase.from("local_business_reviews").select("answered").eq("location_id", locationId),
  ]);
  const counts = { posts: posts ?? 0, reviews: (reviews ?? []).length, answeredReviews: (reviews ?? []).filter((r) => r.answered).length };

  const { scores, checks, issues } = runLocationAudit(loc as AuditLocation, counts);
  const narrative = auditType === "full" ? await generateAuditNarrative(loc as AuditLocation, scores, issues) : { summary: `Profile Health Score ${scores.overall}/100.`, sevenDay: [], thirtyDay: [], contentIdeas: [] };

  const { data: audit, error } = await supabase.from("local_business_audits").insert({
    user_id: user.id, location_id: locationId, audit_type: auditType, overall_score: scores.overall,
    completeness_score: scores.completeness, content_score: scores.content, brand_score: scores.brand,
    seo_score: scores.seo, engagement_score: scores.engagement, status: "ready", summary: narrative.summary,
    report_json: narrative, credits_used: charge.charged,
  }).select("id").single();
  if (error || !audit) return NextResponse.json({ error: error?.message ?? "Audit save failed" }, { status: 500 });

  if (checks.length) await supabase.from("local_business_audit_checks").insert(checks.map((c) => ({ user_id: user.id, audit_id: audit.id, category: c.category, check_key: c.check_key, label: c.label, passed: c.passed, severity: c.severity, detail: c.detail ?? null })));
  if (issues.length) await supabase.from("local_business_audit_issues").insert(issues.map((i) => ({ user_id: user.id, audit_id: audit.id, severity: i.severity, title: i.title, detail: i.detail, recommendation: i.recommendation })));

  await supabase.from("local_business_locations").update({ audit_score: scores.overall, profile_status: scores.overall >= 70 ? "healthy" : "needs_attention", updated_at: new Date().toISOString() }).eq("id", locationId);
  try { await emitNotification(supabase, { userId: user.id, type: "render_complete", title: "Audit complete", body: `Profile Health Score ${scores.overall}/100 for ${(loc as { business_name: string }).business_name}`, link: "/dashboard/grow/local-business/audit" }); } catch { /* best-effort */ }

  return NextResponse.json({ auditId: audit.id, scores, charged: charge.charged });
}
