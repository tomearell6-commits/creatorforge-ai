"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { Category } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Interactive niche explorer for the landing page. Hover/click/focus a category
 * to preview its sub-niches and what the platform produces for it. One category
 * is selected by default so the preview panel is never empty.
 */
export function NicheExplorer({ categories }: { categories: Category[] }) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug);
  const active = categories.find((c) => c.slug === activeSlug) ?? categories[0];

  return (
    <div>
      {/* Category chips */}
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((c) => {
          const isActive = c.slug === active.slug;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => setActiveSlug(c.slug)}
              onMouseEnter={() => setActiveSlug(c.slug)}
              onFocus={() => setActiveSlug(c.slug)}
              aria-pressed={isActive}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-border bg-card hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20"
              )}
            >
              {c.emoji} {c.name}
            </button>
          );
        })}
      </div>

      {/* Preview panel */}
      <div
        key={active.slug}
        className="cf-fade mx-auto mt-8 max-w-2xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
      >
        <div className="flex items-center justify-center gap-2 text-lg font-semibold">
          <span className="text-2xl">{active.emoji}</span>
          {active.name}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{active.description}</p>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Popular sub-niches
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {active.subcategories.map((s) => (
              <span
                key={s}
                className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          Produces: <span className="text-muted-foreground">{active.produces}</span>
        </div>
      </div>
    </div>
  );
}
