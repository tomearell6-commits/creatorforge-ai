/**
 * Build package types + serializers — CLIENT-SAFE (no server-only imports).
 * The Claude generator lives in generate.ts (server only).
 */

export type BuildPage = { pageName: string; purpose: string; sections: string[]; copy: { headline: string; subhead: string; body?: string; cta: string } };
export type BuildFeature = { name: string; description: string; priority: "must" | "should" | "later"; phase: number };
export type RoadmapPhase = { phase: number; title: string; weeks: number; items: string[] };

export type BuildPackage = {
  projectNameIdeas: string[];
  brandPositioning: string;
  targetAudience: string;
  structureOverview: string;
  pages: BuildPage[];
  features: BuildFeature[];
  userFlow: string[];
  sitemap: { path: string; label: string; children?: { path: string; label: string }[] }[];
  ctaStrategy: string;
  seoKeywords: string[];
  blogTopics: string[];
  uiComponentPlan: string[];
  databaseSuggestion: { table: string; purpose: string; keyFields: string[] }[];
  techStack: { layer: string; recommendation: string; reason: string }[];
  roadmap: RoadmapPhase[];
  marketingPlan: {
    launchPhases: { phase: string; actions: string[] }[];
    channels: string[];
    emailSequence: string[];
  };
  disclaimer: string;
};

export const BUILD_DISCLAIMER =
  "Build Studio generates professional plans, structures, copy, and developer briefs — " +
  "it does not deploy a running website or app. Use the export package with your developer, " +
  "a site builder, or an AI coding tool to implement it.";

/** Serialize a package to a shareable Markdown developer brief. */
export function packageToMarkdown(title: string, pkg: BuildPackage): string {
  const L: string[] = [`# ${title} — Project Brief`, "", `> ${pkg.disclaimer}`, ""];
  L.push("## Positioning", pkg.brandPositioning, "", "**Target audience:** " + pkg.targetAudience, "");
  L.push("## Name ideas", ...pkg.projectNameIdeas.map((n) => `- ${n}`), "");
  L.push("## Structure", pkg.structureOverview, "", "### Sitemap");
  for (const s of pkg.sitemap) {
    L.push(`- \`${s.path}\` — ${s.label}`);
    for (const c of s.children ?? []) L.push(`  - \`${c.path}\` — ${c.label}`);
  }
  L.push("", "## Pages");
  for (const p of pkg.pages) {
    L.push(`### ${p.pageName}`, `*${p.purpose}*`, "", `Sections: ${p.sections.join(" → ")}`, "",
      `**H1:** ${p.copy.headline}`, `**Sub:** ${p.copy.subhead}`, p.copy.body ? `\n${p.copy.body}\n` : "", `**CTA:** ${p.copy.cta}`, "");
  }
  L.push("## Features");
  for (const f of pkg.features) L.push(`- [${f.priority.toUpperCase()}] **${f.name}** (phase ${f.phase}) — ${f.description}`);
  L.push("", "## User flow", ...pkg.userFlow.map((s, i) => `${i + 1}. ${s}`), "");
  L.push("## Database suggestion");
  for (const d of pkg.databaseSuggestion) L.push(`- **${d.table}** — ${d.purpose} (${d.keyFields.join(", ")})`);
  L.push("", "## Tech stack");
  for (const t of pkg.techStack) L.push(`- **${t.layer}:** ${t.recommendation} — ${t.reason}`);
  L.push("", "## Roadmap");
  for (const r of pkg.roadmap) L.push(`### Phase ${r.phase}: ${r.title} (~${r.weeks} weeks)`, ...r.items.map((i) => `- ${i}`), "");
  L.push("## Marketing plan", `Channels: ${pkg.marketingPlan.channels.join(", ")}`, "");
  for (const ph of pkg.marketingPlan.launchPhases) L.push(`### ${ph.phase}`, ...ph.actions.map((a) => `- ${a}`), "");
  L.push("### Email sequence", ...pkg.marketingPlan.emailSequence.map((e, i) => `${i + 1}. ${e}`), "");
  L.push("## SEO keywords", pkg.seoKeywords.join(", "), "", "## Blog topics", ...pkg.blogTopics.map((b) => `- ${b}`), "");
  L.push("## CTA strategy", pkg.ctaStrategy, "", "## UI components", pkg.uiComponentPlan.join(", "));
  return L.join("\n");
}
