import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { buildDailySummary } from "@/lib/email-assistant/summary";
import { willUseRealEmailAI } from "@/lib/email-assistant/ai";
import { EMAIL_CREDIT_COSTS, EMAIL_CREDIT_REASONS } from "@/lib/email-assistant/safety";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET  — recent daily summary reports.
 * POST { accountId } — generate today's attention summary now (5 credits when
 * the AI narrative runs; the counts themselves are free aggregation).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("email_summary_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("report_date", { ascending: false })
    .limit(14);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ accountId?: string }>(request);
  if (!body?.accountId) return apiError("accountId is required", 400);

  const { data: account } = await supabase
    .from("email_accounts").select("id").eq("id", body.accountId).eq("user_id", user.id).maybeSingle();
  if (!account) return apiError("Account not found", 404);

  const cost = EMAIL_CREDIT_COSTS.dailySummary;
  const billable = willUseRealEmailAI();
  if (billable) {
    const balance = await getCreditBalance();
    if (balance < cost) return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
  }

  const { summary, usedAI } = await buildDailySummary(supabase, user.id, account.id);

  let creditsUsed = 0;
  if (usedAI && cost > 0) {
    const newBalance = await deductCredits(cost, EMAIL_CREDIT_REASONS.summary);
    if (newBalance !== null) creditsUsed = cost;
  }

  const { data: report, error } = await supabase
    .from("email_summary_reports")
    .upsert(
      { user_id: user.id, account_id: account.id, report_date: new Date().toISOString().slice(0, 10), summary_json: summary, credits_used: creditsUsed },
      { onConflict: "user_id,account_id,report_date" }
    )
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);

  return NextResponse.json({ report, usedAI, creditsUsed });
}
