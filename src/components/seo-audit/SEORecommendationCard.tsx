"use client";

type Rec = { category: string; title: string; detail: string; priority: number };

/** A prioritized AI recommendation. */
export function SEORecommendationCard({ rec }: { rec: Rec }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium capitalize text-brand-700">{rec.category}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Priority {rec.priority}</span>
      </div>
      <p className="mt-1 text-sm font-medium">{rec.title}</p>
      <p className="text-sm text-muted-foreground">{rec.detail}</p>
    </div>
  );
}
