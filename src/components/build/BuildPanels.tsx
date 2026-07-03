"use client";

/** Build Studio panels: dashboard, category grid, template gallery, projects list. */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, LayoutTemplate, FolderKanban, Coins, Star, Crown, Trash2, Hammer,
  Globe, ShoppingBag, Layout, AppWindow, Smartphone, Filter as FilterIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { BUILD_GROUPS, getBuildTypesForGroup } from "@/config/buildStudio";
import { BUILD_DISCLAIMER } from "@/lib/build/package";

const GROUP_ICON: Record<string, typeof Globe> = {
  website: Globe, ecommerce: ShoppingBag, landing: Layout, webapp: AppWindow, mobile: Smartphone, funnel: FilterIcon,
};

// ---------------- Category grid ----------------
export function BuildCategoryGrid() {
  const [active, setActive] = useState(BUILD_GROUPS[0].id);
  const group = BUILD_GROUPS.find((g) => g.id === active)!;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {BUILD_GROUPS.map((g) => {
          const Icon = GROUP_ICON[g.id] ?? Globe;
          return (
            <button key={g.id} onClick={() => setActive(g.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${g.id === active ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30" : "border-border text-muted-foreground hover:bg-muted"}`}>
              <Icon className="h-4 w-4" /> {g.name}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">{group.description}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {getBuildTypesForGroup(active).map((t) => (
          <Link key={t.slug} href={`/dashboard/build/new?type=${t.slug}`}
            className="relative rounded-xl border border-border bg-card p-3 text-sm font-medium transition-shadow hover:shadow-md">
            {t.featured && <Star className="absolute right-2 top-2 h-3.5 w-3.5 fill-brand-400 text-brand-400" />}
            {t.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------- Dashboard ----------------
type Project = { id: string; title: string; category: string | null; project_type: string | null; status: string; credits_used: number; updated_at: string };

export function BuildStudioDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/build/projects", { cache: "no-store" })
      .then((r) => r.json()).then((j) => setProjects(j.projects ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm"><Link href="/dashboard/build/new"><Plus className="h-4 w-4" /> New Project</Link></Button>
        <Button asChild size="sm" variant="secondary"><Link href="/dashboard/build/templates"><LayoutTemplate className="h-4 w-4" /> Templates</Link></Button>
        <Button asChild size="sm" variant="secondary"><Link href="/dashboard/build/projects"><FolderKanban className="h-4 w-4" /> My Projects</Link></Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Spinner size="sm" /> Loading…</div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
          <Hammer className="mb-2 h-8 w-8 text-brand-500" />
          <p className="text-sm font-medium">Turn your idea into a complete project plan</p>
          <p className="mb-3 max-w-md text-xs text-muted-foreground">
            Describe what you want to build — get positioning, page structures with copy, features,
            sitemap, tech stack, a development roadmap and a marketing launch plan in ~30 seconds.
          </p>
          <Button asChild size="sm"><Link href="/dashboard/build/new"><Plus className="h-4 w-4" /> Start your first project</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 6).map((p) => (
            <Link key={p.id} href={`/dashboard/build/editor?project=${p.id}`}>
              <Card className="h-full p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{p.title}</span>
                  <Badge variant={p.status === "generated" ? "brand" : p.status === "exported" ? "success" : "default"}>{p.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.project_type?.replace(/-/g, " ") ?? p.category}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">What can you build?</h2>
        <BuildCategoryGrid />
      </div>
      <p className="text-[11px] text-muted-foreground">{BUILD_DISCLAIMER}</p>
    </div>
  );
}

// ---------------- Template gallery ----------------
type Template = { id: string; name: string; category: string; projectType: string; description: string; defaultIdea: string; estimatedCredits: number; tags: string[]; isFeatured?: boolean; isPremium?: boolean };

export function BuildTemplateGallery() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/build/templates", { cache: "no-store" })
      .then((r) => r.json()).then((j) => setTemplates(j.templates ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => templates.filter((t) =>
    (cat === "all" || t.category === cat) &&
    (!q || t.name.toLowerCase().includes(q.toLowerCase()) || t.tags.some((tag) => tag.includes(q.toLowerCase())))
  ), [templates, cat, q]);

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading templates…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" aria-label="Search templates"
          className="h-9 w-56 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand-500" />
        <button onClick={() => setCat("all")} className={`rounded-full px-3 py-1 text-xs ${cat === "all" ? "bg-brand-100 text-brand-700 dark:bg-brand-950/40" : "text-muted-foreground hover:bg-muted"}`}>All</button>
        {BUILD_GROUPS.map((g) => (
          <button key={g.id} onClick={() => setCat(g.id)} className={`rounded-full px-3 py-1 text-xs ${cat === g.id ? "bg-brand-100 text-brand-700 dark:bg-brand-950/40" : "text-muted-foreground hover:bg-muted"}`}>{g.name}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Card key={t.id} className="flex h-full flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{t.name}</h3>
              <span className="flex gap-1">
                {t.isFeatured && <Star className="h-3.5 w-3.5 fill-brand-400 text-brand-400" />}
                {t.isPremium && <Crown className="h-3.5 w-3.5 text-amber-500" />}
              </span>
            </div>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{t.description}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Coins className="h-3 w-3" /> ~{t.estimatedCredits}</span>
              <Button size="sm" onClick={() => router.push(`/dashboard/build/new?type=${t.projectType}&idea=${encodeURIComponent(t.defaultIdea)}`)}>
                Use template
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No templates match.</p>}
    </div>
  );
}

// ---------------- Projects list ----------------
export function BuildProjectsList() {
  const { confirm, dialog, setLoading: setDialogLoading, close } = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/build/projects", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setProjects(json.projects ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const remove = useCallback(async (p: Project) => {
    const ok = await confirm({ title: "Delete project?", description: <><strong>{p.title}</strong> and its generated package will be permanently removed.</>, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    setDialogLoading(true);
    try {
      await fetch("/api/build/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) });
      await load();
    } finally { close(); }
  }, [confirm, setDialogLoading, close, load]);

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading…</div>;
  if (projects.length === 0) return (
    <Alert variant="info">No projects yet — <Link href="/dashboard/build/new" className="underline">create your first one</Link>.</Alert>
  );

  return (
    <div className="space-y-2">
      {projects.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
          <div className="min-w-0">
            <Link href={`/dashboard/build/editor?project=${p.id}`} className="block truncate text-sm font-medium hover:underline">{p.title}</Link>
            <p className="text-xs text-muted-foreground">{p.project_type?.replace(/-/g, " ")} · {p.credits_used || 0} credits · {new Date(p.updated_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={p.status === "generated" ? "brand" : p.status === "exported" ? "success" : "default"}>{p.status}</Badge>
            <Button asChild size="sm" variant="secondary"><Link href={`/dashboard/build/editor?project=${p.id}`}>Open</Link></Button>
            <button onClick={() => remove(p)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`Delete ${p.title}`}><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
      {dialog}
    </div>
  );
}
