/** Browser Studio shared types (client-safe — no server-only imports). */

export type IssueSeverity = "critical" | "warning" | "passed";
export type InspectionIssue = { severity: IssueSeverity; label: string; detail?: string };

export type OgPreview = {
  title?: string; description?: string; image?: string; type?: string; url?: string; siteName?: string;
};
export type SnippetPreview = { title: string; url: string; description: string };

export type InspectionReport = {
  url: string;
  finalUrl: string;
  ok: boolean;
  status: number;
  loadMs: number;
  score: number;
  meta: {
    title: string | null; titleLength: number;
    metaDescription: string | null; metaDescriptionLength: number;
    canonical: string | null; robotsMeta: string | null; viewport: boolean; lang: string | null; ogTags: number;
  };
  headings: { h1: string[]; h2Count: number; h3Count: number };
  images: { imageCount: number; imagesMissingAlt: number };
  links: { internalLinks: number; externalLinks: number };
  schema: { schemaTypes: string[]; hasJsonLd: boolean };
  content: { wordCount: number; textRatio: number };
  accessibility: { htmlLang: boolean; imagesMissingAlt: number; hasViewport: boolean; h1Count: number };
  og: OgPreview;
  snippet: SnippetPreview;
  issues: InspectionIssue[];
  error?: string;
};

/** Preset AI Website Assistant actions (plus free-form questions). */
export type AssistantAction =
  | "improve_seo" | "rewrite" | "meta_title" | "meta_description"
  | "suggest_headings" | "internal_links" | "explain_issues" | "readability" | "cta";

export const ASSISTANT_ACTIONS: { id: AssistantAction; label: string }[] = [
  { id: "improve_seo", label: "Improve this page for SEO" },
  { id: "meta_title", label: "Generate meta title" },
  { id: "meta_description", label: "Generate meta description" },
  { id: "suggest_headings", label: "Suggest headings" },
  { id: "internal_links", label: "Suggest internal links" },
  { id: "explain_issues", label: "Explain SEO issues" },
  { id: "rewrite", label: "Rewrite this content" },
  { id: "readability", label: "Improve readability" },
  { id: "cta", label: "Improve call-to-action" },
];

export const DEVICE_PRESETS = [
  { id: "desktop", label: "Desktop", width: 1280 },
  { id: "tablet", label: "Tablet", width: 768 },
  { id: "mobile", label: "Mobile", width: 390 },
] as const;
