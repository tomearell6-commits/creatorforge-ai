import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { SEO_AUDIT_FIX_PLAN_CREDITS } from "@/lib/constants";
import { generateFixPlan } from "@/lib/seo-audit/ai";
import type { ScanResult, Scores, AuditIssue } from "@/lib/seo-audit/types";

/** POST /api/seo-audit/fix-plan { auditId } — generate + persist an AI fix plan (25 credits). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "seo-audit-fix", 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Please wait a moment." }, { status: 429 });

  const { auditId } = (await request.json().catch(() => ({}))) as { auditId?: string };
  if (!auditId) return NextResponse.json({ error: "Missing auditId." }, { status: 400 });

  const { data: audit } = await supabase.from("seo_audits").select("id, audit_type").eq("id", auditId).eq("user_id", user.id).maybeSingle();
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: rep } = await supabase.from("seo_audit_reports").select("report_json").eq("audit_id", auditId).maybeSingle();
  const report = rep?.report_json as { scan: ScanResult; scores: Scores; issues: AuditIssue[] } | undefined;
  if (!report) return NextResponse.json({ error: "Audit report not available." }, { status: 400 });

  const cost = SEO_AUDIT_FIX_PLAN_CREDITS;
  if ((await getCreditBalance()) < cost) return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits", needed: cost }, { status: 402 });

  const plan = await generateFixPlan(report.scan, report.scores, report.issues, audit.audit_type);
  await supabase.from("seo_audit_fix_plans").insert({ audit_id: auditId, user_id: user.id, plan_json: plan, credits_used: cost });
  await deductCredits(cost, "seo_audit_fix_plan");

  return NextResponse.json({ plan, creditsUsed: cost });
}
