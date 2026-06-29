/** Shared SEO audit types. */

export type Severity = "critical" | "warning" | "passed";
export type IssueType =
  | "technical" | "onpage" | "content" | "performance" | "mobile"
  | "indexing" | "links" | "images" | "schema";

export type AuditIssue = {
  issue_type: IssueType;
  severity: Severity;
  title: string;
  description: string;
  recommended_fix: string;
  affected_url?: string;
};

export type ScanResult = {
  url: string;
  finalUrl: string;
  statusCode: number;
  loadMs: number;
  ok: boolean;
  https: boolean;
  // metadata
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  canonical: string | null;
  robotsMeta: string | null;
  viewport: boolean;
  lang: string | null;
  ogTags: number;
  // headings
  h1: string[];
  h2Count: number;
  h3Count: number;
  // images
  imageCount: number;
  imagesMissingAlt: number;
  // links
  internalLinks: number;
  externalLinks: number;
  // content
  wordCount: number;
  textRatio: number;        // visible text / html size (rough)
  // technical files
  robotsTxt: { found: boolean; sitemaps: string[]; blocksAll: boolean };
  sitemap: { found: boolean; urlCount: number };
  // schema
  schemaTypes: string[];
  hasJsonLd: boolean;
  // size
  htmlBytes: number;
};

export type Scores = {
  overall: number; technical: number; content: number; performance: number;
  mobile: number; indexing: number; ranking: number;
};

export type Recommendation = { category: string; title: string; detail: string; priority: number };

export type AuditReport = {
  scan: ScanResult;
  scores: Scores;
  issues: AuditIssue[];
  executiveSummary: string;
  recommendations: Recommendation[];
  recommendedContent: { type: string; title: string; reason: string }[];
  usedAI: boolean;
};

export type FixPlan = {
  priorityFixes: { title: string; steps: string[]; priority: number }[];
  wordpressPlugins: string[];
  contentRecommendations: string[];
  internalLinkingPlan: string[];
  blogTopicIdeas: string[];
  metaTitleRewrites: string[];
  metaDescriptionRewrites: string[];
  headingImprovements: string[];
  imageAltSuggestions: string[];
  usedAI: boolean;
};
