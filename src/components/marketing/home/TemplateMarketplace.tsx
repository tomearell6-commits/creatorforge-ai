"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PlatformIcon } from "@/components/icons/PlatformIcon";

type Template = { name: string; studio: string; platform: string; difficulty: "Beginner" | "Intermediate" | "Advanced"; popular?: boolean };

const TEMPLATES: Template[] = [
  { name: "AI Shorts", studio: "Content", platform: "TikTok", difficulty: "Beginner", popular: true },
  { name: "SEO Blog", studio: "Content", platform: "WordPress", difficulty: "Beginner", popular: true },
  { name: "Product Ads", studio: "Marketing", platform: "Facebook", difficulty: "Intermediate", popular: true },
  { name: "TikTok Ads", studio: "Marketing", platform: "TikTok", difficulty: "Intermediate" },
  { name: "Instagram Reels", studio: "Content", platform: "Instagram", difficulty: "Beginner", popular: true },
  { name: "YouTube Videos", studio: "Content", platform: "YouTube", difficulty: "Intermediate" },
  { name: "Children's Books", studio: "Publishing", platform: "Print/EPUB", difficulty: "Intermediate" },
  { name: "Business Books", studio: "Publishing", platform: "Print/EPUB", difficulty: "Advanced" },
  { name: "Landing Pages", studio: "Marketing", platform: "Web", difficulty: "Beginner" },
  { name: "Email Campaigns", studio: "Marketing", platform: "Email", difficulty: "Beginner" },
  { name: "Social Captions", studio: "Content", platform: "Instagram", difficulty: "Beginner", popular: true },
  { name: "SEO Audits", studio: "Analytics", platform: "Web", difficulty: "Beginner" },
  { name: "Website Audits", studio: "Analytics", platform: "Web", difficulty: "Intermediate" },
  { name: "YouTube Thumbnails", studio: "Design", platform: "YouTube", difficulty: "Beginner", popular: true },
  { name: "Instagram Posts", studio: "Design", platform: "Instagram", difficulty: "Beginner", popular: true },
  { name: "Logo Concepts", studio: "Design", platform: "Web", difficulty: "Advanced" },
  { name: "Book Covers", studio: "Design", platform: "Print/EPUB", difficulty: "Intermediate" },
  { name: "Facebook Ad Creatives", studio: "Design", platform: "Facebook", difficulty: "Intermediate" },
  { name: "Luxury Villa Concepts", studio: "Design", platform: "Web", difficulty: "Intermediate", popular: true },
  { name: "Property Listing Flyers", studio: "Design", platform: "Print/EPUB", difficulty: "Beginner" },
  { name: "Property Walkthrough Videos", studio: "Design", platform: "YouTube", difficulty: "Intermediate" },
  { name: "Floor Plan Concepts", studio: "Design", platform: "Web", difficulty: "Intermediate" },
];

const FILTERS: { key: keyof Template | "all"; label: string; values: string[] }[] = [
  { key: "studio", label: "Studio", values: ["Content", "Marketing", "Design", "Publishing", "Analytics"] },
  { key: "platform", label: "Platform", values: ["TikTok", "Instagram", "YouTube", "Facebook", "WordPress", "Email", "Web", "Print/EPUB"] },
  { key: "difficulty", label: "Difficulty", values: ["Beginner", "Intermediate", "Advanced"] },
];

const DIFF_TINT: Record<string, string> = {
  Beginner: "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
  Intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  Advanced: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
};

export function TemplateMarketplace() {
  const [dim, setDim] = useState<string>("all"); // "studio" | "platform" | "difficulty" | "popular" | "all"
  const [value, setValue] = useState<string>("");

  const shown = TEMPLATES.filter((t) => {
    if (dim === "all") return true;
    if (dim === "popular") return t.popular;
    return (t[dim as keyof Template] as string) === value;
  });

  function pick(d: string, v: string) {
    if (dim === d && value === v) { setDim("all"); setValue(""); }
    else { setDim(d); setValue(v); }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <button onClick={() => { setDim("all"); setValue(""); }} className={`rounded-full px-3 py-1.5 text-sm font-medium ${dim === "all" ? "bg-brand-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}>All</button>
        <button onClick={() => { setDim("popular"); setValue("popular"); }} className={`rounded-full px-3 py-1.5 text-sm font-medium ${dim === "popular" ? "bg-brand-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}>Popular</button>
        {FILTERS.map((f) => (
          <div key={f.key as string} className="flex flex-wrap items-center gap-1.5">
            {f.values.map((v) => (
              <button key={v} onClick={() => pick(f.key as string, v)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${dim === f.key && value === v ? "bg-brand-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}>{v}</button>
            ))}
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => (
          <Link key={t.name} href={`/signup?redirect=${encodeURIComponent("/dashboard/templates")}`} className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <PlatformIcon platform={t.platform} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.studio} Studio · {t.platform}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFF_TINT[t.difficulty]}`}>{t.difficulty}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </Link>
        ))}
      </div>
      {shown.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No templates match that filter.</p>}
    </div>
  );
}
