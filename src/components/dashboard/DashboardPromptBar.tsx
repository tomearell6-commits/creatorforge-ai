"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";

/**
 * Persistent "Describe what you want to create…" bar shown across the dashboard.
 * Submitting routes to the new-project flow with the idea prefilled.
 */
export function DashboardPromptBar() {
  const router = useRouter();
  const [idea, setIdea] = useState("");

  function go() {
    const q = idea.trim();
    router.push(q ? `/dashboard/projects/new?idea=${encodeURIComponent(q)}` : "/dashboard/projects/new");
  }

  return (
    <div className="border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 shadow-sm focus-within:border-brand-400">
        <Sparkles className="h-4 w-4 shrink-0 text-brand-600" />
        <input
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="Describe what you want to create…"
          className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Describe what you want to create"
        />
        <button
          onClick={go}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-300 text-brand-900 transition-colors hover:bg-brand-400"
          aria-label="Generate"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
