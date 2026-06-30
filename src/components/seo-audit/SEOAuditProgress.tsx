"use client";

import { Spinner } from "@/components/ui/Spinner";

const STAGES = ["Fetching the page", "Scanning metadata, headings & links", "Checking robots.txt & sitemap", "Analyzing with AI", "Building your report"];

/** Indeterminate progress shown while an audit runs. */
export function SEOAuditProgress() {
  return (
    <div className="rounded-xl border border-border p-6 text-center">
      <Spinner size="lg" className="mx-auto text-brand-600" />
      <p className="mt-3 font-medium">Running your SEO audit…</p>
      <ul className="mx-auto mt-3 max-w-xs space-y-1 text-left text-sm text-muted-foreground">
        {STAGES.map((s) => <li key={s} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> {s}</li>)}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">This usually takes a few seconds.</p>
    </div>
  );
}
