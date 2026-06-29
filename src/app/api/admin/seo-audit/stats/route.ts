import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/** GET — SEO audit usage analytics for the admin portal. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const [{ data: audits }, { data: issues }] = await Promise.all([
    admin.from("seo_audits").select("audit_type, status, overall_score, credits_used"),
    admin.from("seo_audit_issues").select("title, severity").eq("severity", "critical"),
  ]);

  const rows = audits ?? [];
  const completed = rows.filter((r) => r.status === "completed");
  const failed = rows.filter((r) => r.status === "failed").length;
  const creditsConsumed = rows.reduce((a, r) => a + (r.credits_used ?? 0), 0);
  const avgScore = completed.length ? Math.round(completed.reduce((a, r) => a + (r.overall_score ?? 0), 0) / completed.length) : 0;

  const byType = new Map<string, number>();
  for (const r of rows) byType.set(r.audit_type, (byType.get(r.audit_type) ?? 0) + 1);
  const topTypes = [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([type, n]) => ({ type, n }));

  const issueCounts = new Map<string, number>();
  for (const i of issues ?? []) issueCounts.set(i.title, (issueCounts.get(i.title) ?? 0) + 1);
  const commonIssues = [...issueCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([title, n]) => ({ title, n }));

  return NextResponse.json({
    stats: {
      total: rows.length, completed: completed.length, failed,
      creditsConsumed, avgScore, topTypes, commonIssues,
      // Revenue proxy: audit credits consumed (credits are the monetized unit).
      auditCredits: creditsConsumed,
    },
  });
}
