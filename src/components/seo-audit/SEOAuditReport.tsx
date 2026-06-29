"use client";

import Link from "next/link";
import { Sparkles, Loader2, FileText } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SEOAuditScoreCard } from "./SEOAuditScoreCard";
import { SEOIssueTable } from "./SEOIssueTable";
import { SEORecommendationCard } from "./SEORecommendationCard";
import { SEOFixPlan } from "./SEOFixPlan";
import { SEOAuditPDFButton } from "./SEOAuditPDFButton";

export function SEOAuditReport({ auditId, report, issues, fixPlan, onGenerateFixPlan, fixBusy }: {
  auditId: string; report: any; issues: any[]; fixPlan: any | null; onGenerateFixPlan: () => void; fixBusy: boolean;
}) {
  const scores = report?.scores ?? {};
  const scan = report?.scan ?? {};

  return (
    <div className="space-y-6">
      {/* Header + actions */}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>SEO Audit Report</CardTitle>
          <p className="text-sm text-muted-foreground">{scan.finalUrl ?? scan.url}</p>
          {!report?.usedAI && <p className="mt-1 text-xs text-amber-700">Generated with the built-in analyzer. Set ANTHROPIC_API_KEY for richer AI recommendations.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SEOAuditPDFButton auditId={auditId} />
          <Button asChild variant="accent"><Link href="/dashboard/seo/new"><Sparkles className="h-4 w-4" /> Generate SEO Content From This Audit</Link></Button>
        </div>
      </Card>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <SEOAuditScoreCard label="Overall" score={scores.overall} big />
        <SEOAuditScoreCard label="Technical" score={scores.technical} />
        <SEOAuditScoreCard label="Content" score={scores.content} />
        <SEOAuditScoreCard label="Performance" score={scores.performance} />
        <SEOAuditScoreCard label="Mobile" score={scores.mobile} />
        <SEOAuditScoreCard label="Indexing" score={scores.indexing} />
        <SEOAuditScoreCard label="Ranking" score={scores.ranking} />
      </div>

      {/* Executive summary */}
      <Card>
        <CardTitle className="text-base">Executive Summary</CardTitle>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{report?.executiveSummary}</p>
      </Card>

      {/* Metadata snapshot */}
      <Card>
        <CardTitle className="text-base">Metadata & Structure</CardTitle>
        <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Row label="Title" value={scan.title ?? "—"} />
          <Row label="Title length" value={`${scan.titleLength ?? 0} chars`} />
          <Row label="Meta description" value={scan.metaDescription ? `${scan.metaDescriptionLength} chars` : "Missing"} />
          <Row label="H1" value={scan.h1?.length ? `${scan.h1.length}` : "None"} />
          <Row label="Images / missing alt" value={`${scan.imageCount ?? 0} / ${scan.imagesMissingAlt ?? 0}`} />
          <Row label="Internal · external links" value={`${scan.internalLinks ?? 0} · ${scan.externalLinks ?? 0}`} />
          <Row label="Words" value={`${scan.wordCount ?? 0}`} />
          <Row label="Schema" value={scan.schemaTypes?.length ? scan.schemaTypes.join(", ") : (scan.hasJsonLd ? "JSON-LD" : "None")} />
          <Row label="robots.txt" value={scan.robotsTxt?.found ? "Found" : "Missing"} />
          <Row label="Sitemap" value={scan.sitemap?.found ? `${scan.sitemap.urlCount} URLs` : "Missing"} />
          <Row label="HTTPS" value={scan.https ? "Yes" : "No"} />
          <Row label="Mobile viewport" value={scan.viewport ? "Yes" : "No"} />
        </div>
      </Card>

      {/* Issues */}
      <Card>
        <CardTitle className="text-base">Issues & Checks</CardTitle>
        <div className="mt-3"><SEOIssueTable issues={issues} /></div>
      </Card>

      {/* Recommendations */}
      {report?.recommendations?.length > 0 && (
        <Card>
          <CardTitle className="text-base">AI Recommendations</CardTitle>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{report.recommendations.map((r: any, i: number) => <SEORecommendationCard key={i} rec={r} />)}</div>
        </Card>
      )}

      {/* Recommended content */}
      {report?.recommendedContent?.length > 0 && (
        <Card>
          <CardTitle className="text-base">Recommended Content To Create</CardTitle>
          <ul className="mt-2 space-y-2">
            {report.recommendedContent.map((c: any, i: number) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 p-2 text-sm">
                <span><span className="font-medium">{c.type}:</span> {c.title} <span className="text-muted-foreground">— {c.reason}</span></span>
                <Button asChild size="sm" variant="outline"><Link href="/dashboard/seo/new">Create</Link></Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Fix plan */}
      {fixPlan ? <SEOFixPlan plan={fixPlan} /> : (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div><CardTitle className="text-base">Need a step-by-step plan?</CardTitle><p className="text-sm text-muted-foreground">Generate a prioritized SEO fix plan with WordPress, content, linking and metadata recommendations.</p></div>
          <Button onClick={onGenerateFixPlan} disabled={fixBusy}>{fixBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Generate Fix Plan (25 cr)</Button>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 border-b border-border/40 py-1"><span className="text-muted-foreground">{label}</span><span className="truncate font-medium">{value}</span></div>;
}
