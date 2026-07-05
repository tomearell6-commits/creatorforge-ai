/**
 * Business reports — REAL metrics collected from the database, optionally
 * narrated by AI. Also: per-user document numbering.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { buildUsageReport } from "@/lib/billing/usage";
import { buildCompanyContext, narrateReport, type BusinessReportContent } from "@/lib/business/ai";

export type ReportMetrics = Record<string, number | string>;

export async function collectMetrics(userId: string, reportType: string): Promise<ReportMetrics> {
  const admin = createAdminClient();
  const days = reportType === "monthly" || reportType === "growth" ? 30 : 7;
  const since = new Date(Date.now() - days * 864e5).toISOString();

  const [inqNew, inqReplied, inqOpen, drafts, products, docs, usage, wallet] = await Promise.all([
    admin.from("business_inquiries").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
    admin.from("business_inquiries").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "replied").gte("updated_at", since),
    admin.from("business_inquiries").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["new", "in_progress"]),
    admin.from("inquiry_replies").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "draft"),
    admin.from("business_products").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "published"),
    admin.from("business_documents").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
    buildUsageReport(userId),
    admin.from("profiles").select("credits, plan").eq("user_id", userId).maybeSingle(),
  ]);

  const periodUsage = usage.daily.slice(-days).reduce((s, d) => s + d.credits, 0);
  const topCategory = usage.byCategory[0];

  return {
    periodDays: days,
    newInquiries: inqNew.count ?? 0,
    inquiriesReplied: inqReplied.count ?? 0,
    inquiriesOpen: inqOpen.count ?? 0,
    draftRepliesReady: drafts.count ?? 0,
    productsPublished: products.count ?? 0,
    documentsGenerated: docs.count ?? 0,
    creditsUsedPeriod: periodUsage,
    creditsRemaining: wallet.data?.credits ?? 0,
    plan: wallet.data?.plan ?? "free",
    topActivity: topCategory ? `${topCategory.label} (${topCategory.credits} credits)` : "none",
  };
}

export async function buildBusinessReport(
  userId: string,
  reportType: string
): Promise<{ metrics: ReportMetrics; content: BusinessReportContent; usedAI: boolean }> {
  const metrics = await collectMetrics(userId, reportType);
  const context = await buildCompanyContext(userId);
  const { result: content, usedAI } = await narrateReport(reportType, metrics, context);
  return { metrics, content, usedAI };
}

/** Per-user document number: BD-<year>-<4 digits>. */
export async function nextDocNumber(userId: string): Promise<string> {
  const admin = createAdminClient();
  const year = new Date().getUTCFullYear();
  const { count } = await admin
    .from("business_documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .like("doc_number", `BD-${year}-%`);
  return `BD-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

/** Audit trail for automated/AI actions in the module. */
export async function logBizActivity(userId: string, action: string, detail?: string, metadata?: Record<string, unknown>) {
  const admin = createAdminClient();
  await admin.from("business_ops_activity").insert({ user_id: userId, action, detail: detail ?? null, metadata: metadata ?? {} }).then(() => {}, () => {});
}
