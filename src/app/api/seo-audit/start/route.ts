import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { seoAuditType, SEO_AUDIT_TYPES } from "@/lib/constants";
import { validateAuditUrl } from "@/lib/seo-audit/ssrf";
import { runAudit } from "@/lib/seo-audit/engine";
import { captureError } from "@/lib/logger";

/**
 * POST /api/seo-audit/start { url, auditType }
 * Validates the URL (SSRF-guarded), runs the modular scan + scoring + AI, persists
 * the audit/issues/scores/report, and deducts the audit-type credit cost on success.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "seo-audit", 6, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many audits. Please wait a minute." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { url?: string; auditType?: string };
  if (!body.auditType || !SEO_AUDIT_TYPES.some((t) => t.id === body.auditType)) {
    return NextResponse.json({ error: "Choose a valid audit type." }, { status: 400 });
  }
  const check = await validateAuditUrl(body.url ?? "");
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const type = seoAuditType(body.auditType);
  const cost = type.credits;
  if ((await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits for this audit.", code: "insufficient_credits", needed: cost }, { status: 402 });
  }

  // Create the audit row (scanning).
  const { data: audit, error: aErr } = await supabase.from("seo_audits")
    .insert({ user_id: user.id, website_url: check.url.toString(), audit_type: type.id, status: "scanning", started_at: new Date().toISOString() })
    .select("id").single();
  if (aErr || !audit) { captureError(aErr, { category: "api", feature: "seo-audit", stage: "insert" }); return NextResponse.json({ error: "Could not start audit." }, { status: 500 }); }

  try {
    const report = await runAudit(check.url.toString(), type.id);
    const { scores, issues } = report;

    // Persist scores into the audit row + scores table.
    await supabase.from("seo_audits").update({
      status: "completed", overall_score: scores.overall, technical_score: scores.technical,
      content_score: scores.content, performance_score: scores.performance, mobile_score: scores.mobile,
      indexing_score: scores.indexing, ranking_score: scores.ranking, credits_used: cost,
      completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", audit.id);

    await supabase.from("seo_audit_pages").insert({ audit_id: audit.id, url: report.scan.finalUrl, status_code: report.scan.statusCode, load_ms: report.scan.loadMs, metadata: { title: report.scan.title, words: report.scan.wordCount } });
    if (issues.length) await supabase.from("seo_audit_issues").insert(issues.map((i) => ({ audit_id: audit.id, issue_type: i.issue_type, severity: i.severity, title: i.title, description: i.description, recommended_fix: i.recommended_fix, affected_url: i.affected_url })));
    await supabase.from("seo_audit_scores").insert((Object.entries(scores) as [string, number][]).map(([category, score]) => ({ audit_id: audit.id, category, score })));
    if (report.recommendations.length) await supabase.from("seo_audit_recommendations").insert(report.recommendations.map((r) => ({ audit_id: audit.id, category: r.category, title: r.title, detail: r.detail, priority: r.priority })));
    await supabase.from("seo_audit_reports").insert({ audit_id: audit.id, report_json: report, summary: report.executiveSummary });

    await deductCredits(cost, `seo_audit:${type.id}`);

    return NextResponse.json({ auditId: audit.id, report, creditsUsed: cost, usedAI: report.usedAI });
  } catch (e) {
    captureError(e, { category: "api", feature: "seo-audit", stage: "run" });
    await supabase.from("seo_audits").update({ status: "failed", error: "Audit failed", updated_at: new Date().toISOString() }).eq("id", audit.id);
    return NextResponse.json({ error: "The audit could not complete. No credits were charged.", auditId: audit.id }, { status: 502 });
  }
}

export const maxDuration = 60;
