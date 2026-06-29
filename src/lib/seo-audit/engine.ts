/**
 * Audit orchestrator: scan → score → AI analysis → assembled report.
 * The caller (API route) handles URL validation, credits, and persistence.
 */
import "server-only";
import { runScan } from "./scanners";
import { computeScoresAndIssues } from "./scoring";
import { generateAnalysis } from "./ai";
import type { AuditReport } from "./types";

export async function runAudit(targetUrl: string, auditType: string): Promise<AuditReport> {
  const scan = await runScan(targetUrl);
  const { scores, issues } = computeScoresAndIssues(scan);
  const analysis = await generateAnalysis(scan, scores, issues, auditType);
  return {
    scan, scores, issues,
    executiveSummary: analysis.executiveSummary,
    recommendations: analysis.recommendations,
    recommendedContent: analysis.recommendedContent,
    usedAI: analysis.usedAI,
  };
}

export type { AuditReport } from "./types";
