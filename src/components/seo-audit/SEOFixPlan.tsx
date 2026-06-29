"use client";

import { Card } from "@/components/ui/Card";

type FixPlan = {
  priorityFixes: { title: string; steps: string[]; priority: number }[];
  wordpressPlugins: string[]; contentRecommendations: string[]; internalLinkingPlan: string[];
  blogTopicIdeas: string[]; metaTitleRewrites: string[]; metaDescriptionRewrites: string[];
  headingImprovements: string[]; imageAltSuggestions: string[];
};

function List({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

/** Renders the generated AI fix plan. */
export function SEOFixPlan({ plan }: { plan: FixPlan }) {
  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold">SEO Fix Plan</h3>
      {plan.priorityFixes?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold">Priority fixes</h4>
          <ol className="mt-1 space-y-2">
            {plan.priorityFixes.map((f, i) => (
              <li key={i} className="rounded-lg bg-muted/40 p-2 text-sm">
                <span className="font-medium">{f.title}</span>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">{f.steps.map((s, j) => <li key={j}>{s}</li>)}</ul>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <List title="WordPress plugin suggestions" items={plan.wordpressPlugins} />
        <List title="Content recommendations" items={plan.contentRecommendations} />
        <List title="Internal linking plan" items={plan.internalLinkingPlan} />
        <List title="Blog topic ideas" items={plan.blogTopicIdeas} />
        <List title="Meta title rewrites" items={plan.metaTitleRewrites} />
        <List title="Meta description rewrites" items={plan.metaDescriptionRewrites} />
        <List title="Heading improvements" items={plan.headingImprovements} />
        <List title="Image alt text suggestions" items={plan.imageAltSuggestions} />
      </div>
    </Card>
  );
}
