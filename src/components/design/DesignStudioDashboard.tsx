"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, LayoutTemplate, Palette, Clapperboard, FileDown, FolderKanban, Layers, Coins, Sparkles, Star, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { FEATURED_DESIGN_CATEGORIES } from "@/config/designStudio";
import { DesignCategoryGrid } from "./DesignCategoryGrid";

type Project = { id: string; title: string; category: string | null; status: string; width: number; height: number; updated_at: string; credits_used: number };

const QUICK = [
  { href: "/dashboard/design/new", label: "New Design", icon: Plus },
  { href: "/dashboard/design/industries", label: "Industry Suites", icon: Building2 },
  { href: "/dashboard/design/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/design/brand-kit", label: "Brand Kit", icon: Palette },
  { href: "/dashboard/design/video-graphics", label: "Live Footage", icon: Clapperboard },
  { href: "/dashboard/design/exports", label: "Exports", icon: FileDown },
  { href: "/dashboard/design/projects", label: "Projects", icon: FolderKanban },
];

export function DesignStudioDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [exports, setExports] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, e] = await Promise.all([
          fetch("/api/design/projects", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/design/export", { cache: "no-store" }).then((r) => r.json()),
        ]);
        setProjects(p.projects ?? []);
        setExports((e.exports ?? []).length);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const creditsUsed = projects.reduce((n, p) => n + (p.credits_used ?? 0), 0);

  const metrics = [
    { label: "Designs created", value: projects.length, icon: Layers },
    { label: "Exports", value: exports, icon: FileDown },
    { label: "Credits used", value: creditsUsed, icon: Coins },
  ];

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <Button key={q.href} asChild variant={q.href.endsWith("/new") ? "primary" : "secondary"} size="sm">
            <Link href={q.href}><q.icon className="h-4 w-4" /> {q.label}</Link>
          </Button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-4">
            <m.icon className="h-5 w-5 text-brand-600" />
            <div className="mt-2 text-2xl font-bold">{loading ? "—" : m.value}</div>
            <div className="text-xs text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent designs</h2>
          <Link href="/dashboard/design/projects" className="text-xs text-brand-600 hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Spinner size="sm" /> Loading…</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
            <Sparkles className="mb-2 h-8 w-8 text-brand-500" />
            <p className="text-sm font-medium">Create your first design</p>
            <p className="mb-3 text-xs text-muted-foreground">Pick a category and let AI draft a professional concept you can edit.</p>
            <Button asChild size="sm"><Link href="/dashboard/design/new"><Plus className="h-4 w-4" /> New Design</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {projects.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/dashboard/design/editor?project=${p.id}`} className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
                <div className="flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 dark:from-slate-800 dark:to-slate-900" style={{ aspectRatio: `${p.width} / ${p.height}` }}>
                  <Layers className="h-7 w-7" />
                </div>
                <div className="p-2.5">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="mt-0.5 text-[11px] capitalize text-muted-foreground">{p.status}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Industry Suites promo */}
      <Link href="/dashboard/design/industries" className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 transition-shadow hover:shadow-md dark:border-brand-900 dark:bg-brand-950/20">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-900 text-brand-300 dark:bg-brand-950/50 dark:text-brand-300">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-semibold">Professional Industry Suites</div>
            <div className="text-xs text-muted-foreground">Real Estate & Architecture is live — floor plans, interiors, property marketing and AI walkthroughs.</div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-brand-600" />
      </Link>

      {/* Featured categories */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Popular designs</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {FEATURED_DESIGN_CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/dashboard/design/new?category=${c.slug}`} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
              <span className="truncate">{c.name}</span>
              <Star className="h-3.5 w-3.5 shrink-0 fill-brand-400 text-brand-400" />
            </Link>
          ))}
        </div>
      </div>

      {/* Full category browser */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Browse all categories</h2>
        <DesignCategoryGrid />
      </div>
    </div>
  );
}
