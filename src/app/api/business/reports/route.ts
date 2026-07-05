import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { buildBusinessReport, logBizActivity } from "@/lib/business/reports";
import { willUseRealBusinessAI } from "@/lib/business/ai";
import { REPORT_TYPES, BUSINESS_CREDIT_COSTS, BUSINESS_CREDIT_REASONS } from "@/config/businessOps";

export const maxDuration = 60;

/** Business Reports: list stored + generate a new one from live metrics. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: reports } = await admin
    .from("business_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  return NextResponse.json({ reports: reports ?? [] });
}

export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "biz-report", 6, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reportType } = await req.json().catch(() => ({}));
  if (!REPORT_TYPES.some((r) => r.id === reportType)) {
    return NextResponse.json({ error: "Invalid report type." }, { status: 400 });
  }

  const cost = willUseRealBusinessAI() ? BUSINESS_CREDIT_COSTS.businessReport : 0;
  if (cost > 0 && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits.", required: cost }, { status: 402 });
  }

  const { metrics, content, usedAI } = await buildBusinessReport(user.id, reportType);
  const days = Number(metrics.periodDays ?? 7);

  const admin = createAdminClient();
  const { data: saved, error } = await admin.from("business_reports").insert({
    user_id: user.id,
    report_type: reportType,
    period_start: new Date(Date.now() - days * 864e5).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    report_json: { metrics, content },
    used_ai: usedAI,
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Could not save the report." }, { status: 500 });

  if (usedAI && cost > 0) await deductCredits(cost, BUSINESS_CREDIT_REASONS.businessReport);
  await logBizActivity(user.id, "report.generated", reportType, { usedAI });

  return NextResponse.json({ report: saved, usedAI, creditsCharged: usedAI ? cost : 0 });
}
