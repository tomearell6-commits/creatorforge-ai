"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2, Plus, Clapperboard, LayoutTemplate, Coins, Star, Crown, Trash2,
  Video, Megaphone, CalendarDays, AlertTriangle,
  Home, Gem, Briefcase, Store, Hotel, UtensilsCrossed, Palmtree, HeartPulse,
  GraduationCap, Warehouse, Factory, Church, Coffee, Scissors, Dumbbell, Users,
  TrendingUp, FileText, Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { REAL_ESTATE_GROUPS, RE_DISCLAIMER, slugifySuiteCategory, getSuiteBySlug } from "@/config/industrySuites";
import { getIndustryTemplatesForSuite, type IndustryTemplate } from "@/config/industryTemplates";
import { RealEstateWizard } from "./RealEstateWizard";
import { WalkthroughDesigner } from "./WalkthroughDesigner";

const TEMPLATE_ICONS: Record<string, typeof Home> = {
  Home, Gem, Building2, Briefcase, Store, Hotel, UtensilsCrossed, Palmtree, HeartPulse,
  GraduationCap, Warehouse, Factory, Church, Coffee, Scissors, Dumbbell, Users,
  TrendingUp, FileText, Megaphone, Instagram, Clapperboard,
};

type Tab = "overview" | "create" | "walkthrough" | "projects";
type ReProject = { id: string; project_name: string; property_type: string | null; output_type: string; status: string; credits_used: number; updated_at: string };

export function RealEstateSuite() {
  const suite = getSuiteBySlug("real-estate-architecture")!;
  const templates = getIndustryTemplatesForSuite("real-estate-architecture");
  const { confirm, dialog, setLoading, close } = useConfirm();

  const [tab, setTab] = useState<Tab>("overview");
  const [activeGroup, setActiveGroup] = useState(REAL_ESTATE_GROUPS[0].id);
  const [wizardSeed, setWizardSeed] = useState<{ template?: IndustryTemplate; category?: string } | null>(null);
  const [projects, setProjects] = useState<ReProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/design/realestate/projects", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setProjects(json.projects ?? []);
    } finally {
      setLoadingProjects(false);
    }
  }, []);
  useEffect(() => { void loadProjects(); }, [loadProjects]);

  const openWizard = (seed: { template?: IndustryTemplate; category?: string }) => {
    setWizardSeed(seed);
    setTab("create");
  };

  const removeProject = useCallback(async (p: ReProject) => {
    const ok = await confirm({ title: "Delete property project?", description: <><strong>{p.project_name}</strong> and its generated outputs will be removed.</>, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    setLoading(true);
    try {
      await fetch("/api/design/realestate/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) });
      await loadProjects();
    } finally {
      close();
    }
  }, [confirm, setLoading, close, loadProjects]);

  const group = REAL_ESTATE_GROUPS.find((g) => g.id === activeGroup)!;
  const featured = templates.filter((x) => x.isFeatured);

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "create", label: "New Project" },
    { id: "walkthrough", label: "AI Walkthrough" },
    { id: "projects", label: `My Projects (${projects.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Suite header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{suite.name}</h1>
            <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{suite.description}</p>
          </div>
        </div>
        <Button onClick={() => openWizard({})}><Plus className="h-4 w-4" /> Create New Project</Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === x.id ? "border-brand-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {x.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Featured templates */}
          <div>
            <h2 className="mb-2 text-sm font-semibold">Featured templates</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {featured.map((x) => {
                const Icon = TEMPLATE_ICONS[x.previewIcon] ?? Building2;
                return (
                  <button key={x.id} onClick={() => openWizard({ template: x })}
                    className="rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <Icon className="h-6 w-6 text-brand-600" />
                      {x.isPremium && <Crown className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-tight">{x.name}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Coins className="h-3 w-3" /> ~{x.estimatedCredits} credits</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category browser */}
          <div>
            <h2 className="mb-2 text-sm font-semibold">Design categories</h2>
            <div className="flex flex-wrap gap-2">
              {REAL_ESTATE_GROUPS.map((g) => (
                <button key={g.id} onClick={() => setActiveGroup(g.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${g.id === activeGroup ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  {g.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{group.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {group.categories.map((name) => (
                <button key={name} onClick={() => openWizard({ category: slugifySuiteCategory(name) })}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-left text-sm hover:bg-muted">
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* All templates */}
          <div>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><LayoutTemplate className="h-4 w-4 text-brand-600" /> Template library ({templates.length})</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {templates.map((x) => {
                const Icon = TEMPLATE_ICONS[x.previewIcon] ?? Building2;
                return (
                  <button key={x.id} onClick={() => openWizard({ template: x })}
                    className="rounded-xl border border-border bg-card p-3 text-left transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <Icon className="h-5 w-5 text-brand-600" />
                      <span className="flex gap-1">
                        {x.isFeatured && <Star className="h-3.5 w-3.5 fill-brand-400 text-brand-400" />}
                        {x.isPremium && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold leading-tight">{x.name}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{x.description}</p>
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"><Coins className="h-3 w-3" /> ~{x.estimatedCredits}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Related studios */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Related Studios</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary"><Link href="/dashboard/projects/new"><Video className="h-4 w-4" /> Video Studio</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link href="/dashboard/ads/create"><Megaphone className="h-4 w-4" /> AI Advertising Studio</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link href="/dashboard/calendar"><CalendarDays className="h-4 w-4" /> Publishing Calendar</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link href="/dashboard/design"><LayoutTemplate className="h-4 w-4" /> Design Studio</Link></Button>
            </div>
          </div>

          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {RE_DISCLAIMER}
          </p>
        </div>
      )}

      {tab === "create" && (
        <RealEstateWizard
          key={wizardSeed?.template?.id ?? wizardSeed?.category ?? "blank"}
          template={wizardSeed?.template}
          category={wizardSeed?.category}
        />
      )}

      {tab === "walkthrough" && <WalkthroughDesigner />}

      {tab === "projects" && (
        loadingProjects ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
            <Building2 className="mb-2 h-8 w-8 text-brand-500" />
            <p className="text-sm font-medium">No property projects yet</p>
            <p className="mb-3 text-xs text-muted-foreground">Run the wizard to create your first real estate concept.</p>
            <Button size="sm" onClick={() => openWizard({})}><Plus className="h-4 w-4" /> Create New Project</Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Project</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Output</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Credits</th>
                  <th className="px-4 py-2 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium">{p.project_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.property_type ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.output_type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5"><Badge variant={p.status === "generated" ? "brand" : p.status === "exported" ? "success" : "default"}>{p.status}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.credits_used || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => removeProject(p)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`Delete ${p.project_name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {dialog}
    </div>
  );
}
