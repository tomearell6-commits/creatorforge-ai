/**
 * Audit orchestrator: scan → score → AI analysis → assembled report.
 * The caller (API route) handles URL validation, credits, and persistence.
 */
import "server-only";
import { runScan } from "./scanners";
import { computeScoresAndIssues } from "./scoring";
import { generateAnalysis } from "./ai";
import { crawlSite } from "./crawl";
import { siteIssues, sitePenalty, type SiteScan } from "./site";
import type { AuditReport } from "./types";

export async function runAudit(targetUrl: string, auditType: string): Promise<AuditReport> {
  const scan = await runScan(targetUrl);
  const base = computeScoresAndIssues(scan);
  let { scores, issues } = base;

  // Every audit type except Quick reads up to 25 pages and checks the site as a whole.
  let site: SiteScan | undefined;
  if (auditType !== "quick") {
    try { site = await crawlSite(targetUrl); } catch { site = undefined; }
    if (site) {
      issues = [...issues, ...siteIssues(site)];
      const p = sitePenalty(site);
      const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
      scores = { ...scores, content: clamp(scores.content - p), ranking: clamp(scores.ranking - p * 0.4), overall: clamp(scores.overall - p * 0.3) };
    }
  }

  const analysis = await generateAnalysis(scan, scores, issues, auditType, site);
  return {
    scan, scores, issues,
    executiveSummary: analysis.executiveSummary,
    recommendations: analysis.recommendations,
    recommendedContent: analysis.recommendedContent,
    usedAI: analysis.usedAI,
    ...(site ? { site } : {}),
  };
}

export type { AuditReport } from "./types";
