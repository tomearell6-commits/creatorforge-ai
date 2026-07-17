"use client";

/**
 * Build project editor/viewer: Overview · Pages (WebsiteStructurePreview) ·
 * App Spec (AppStructurePreview) · Sitemap (SitemapViewer) · Roadmap
 * (RoadmapBuilder) · Marketing (MarketingPlanViewer) · Export (BuildExportPanel).
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles, FileDown, Printer, Copy, Check, Coins, Globe, Layers, Map as MapIcon,
  CalendarDays, Megaphone, Package, PenLine, Video, Search, Palette, Rocket,
} from "lucide-react";
import { SitePublishPanel } from "@/components/build/SitePublishPanel";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { packageToMarkdown, BUILD_DISCLAIMER, type BuildPackage } from "@/lib/build/package";
import { BUILD_CREDIT_COSTS } from "@/config/buildStudio";
import { ContentCompletionPanel } from "@/components/publishing/ContentCompletionPanel";

type Project = {
  id: string; title: string; category: string | null; project_type: string | null; idea: string | null;
  target_audience: string | null; goal: string | null; style: string | null; status: string;
  package_json: BuildPackage | null; credits_used: number;
};

const TABS = [
  { id: "overview", label: "Overview", icon: Globe },
  { id: "pages", label: "Pages & Copy", icon: Layers },
  { id: "spec", label: "App Spec", icon: Package },
  { id: "sitemap", label: "Sitemap", icon: MapIcon },
  { id: "roadmap", label: "Roadmap", icon: CalendarDays },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "export", label: "Export", icon: FileDown },
  { id: "publish", label: "Publish site", icon: Rocket },
] as const;

export function BuildEditor() {
  const projectId = useSearchParams().get("project");
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ v: "success" | "error" | "info"; t: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const res = await fetch(`/api/build/projects/${projectId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setProject(json.project);
    setLoading(false);
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);

  const generate = useCallback(async () => {
    if (!projectId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/build/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }),
      });
      const raw = await res.text();
      let json: { error?: string; creditsUsed?: number; usedAI?: boolean };
      try { json = JSON.parse(raw); } catch { throw new Error("Generation took too long — try again."); }
      if (res.status === 402) throw new Error("Not enough credits. Top up in Credit Wallet.");
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setMsg({ v: "success", t: `Full project package generated${json.creditsUsed ? ` · ${json.creditsUsed} credits` : " · free (placeholder mode)"}` });
      await load();
    } catch (e) {
      setMsg({ v: "error", t: e instanceof Error ? e.message : "Generation failed" });
    } finally {
      setBusy(false);
    }
  }, [projectId, load]);

  const recordExport = useCallback(async (format: string) => {
    try {
      await fetch("/api/build/export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, format }),
      });
    } catch { /* best-effort */ }
  }, [projectId]);

  if (!projectId) {
    return (
      <Alert variant="info">
        Open a project from <Link className="underline" href="/dashboard/build/projects">My Projects</Link> or{" "}
        <Link className="underline" href="/dashboard/build/new">create a new one</Link>.
      </Alert>
    );
  }
  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading project…</div>;
  if (!project) return <Alert variant="error">Project not found.</Alert>;

  const pkg = project.package_json;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{project.title}</h2>
          <p className="text-xs text-muted-foreground">
            {project.project_type?.replace(/-/g, " ")} · goal: {project.goal ?? "—"} · style: {project.style ?? "—"} · <Badge variant={project.status === "generated" ? "brand" : "default"}>{project.status}</Badge>
          </p>
        </div>
        <Button onClick={generate} disabled={busy}>
          {busy ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />}
          {pkg ? "Regenerate package" : "Generate full package"}
          <span className="inline-flex items-center gap-0.5 text-xs opacity-80"><Coins className="h-3 w-3" /> ~{BUILD_CREDIT_COSTS.fullPackage}</span>
        </Button>
      </div>
      {msg && <Alert variant={msg.v}>{msg.t}</Alert>}

      {!pkg ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
          <Sparkles className="mb-2 h-8 w-8 text-brand-500" />
          <p className="text-sm font-medium">No package generated yet</p>
          <p className="mb-1 max-w-md text-xs text-muted-foreground">
            Generate the full package: positioning, page structures with copy, features, user flow,
            sitemap, database + tech-stack suggestion, roadmap and marketing launch plan.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 border-b border-border">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === t.id ? "border-brand-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-4"><h3 className="text-sm font-semibold">Brand positioning</h3><p className="mt-1 text-sm text-muted-foreground">{pkg.brandPositioning}</p></Card>
                <Card className="p-4"><h3 className="text-sm font-semibold">Target audience</h3><p className="mt-1 text-sm text-muted-foreground">{pkg.targetAudience}</p></Card>
              </div>
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Project name ideas</h3>
                <div className="mt-2 flex flex-wrap gap-2">{pkg.projectNameIdeas.map((n, i) => <Badge key={i} variant="outline">{n}</Badge>)}</div>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-semibold">User flow</h3>
                <ol className="mt-2 list-inside list-decimal space-y-0.5 text-sm text-muted-foreground">{pkg.userFlow.map((s, i) => <li key={i}>{s}</li>)}</ol>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-semibold">CTA strategy</h3><p className="mt-1 text-sm text-muted-foreground">{pkg.ctaStrategy}</p>
              </Card>
              {/* Studio hand-offs */}
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary"><Link href="/dashboard/generate"><PenLine className="h-4 w-4" /> Write content</Link></Button>
                <Button asChild size="sm" variant="secondary"><Link href="/dashboard/design/new"><Palette className="h-4 w-4" /> Design assets</Link></Button>
                <Button asChild size="sm" variant="secondary"><Link href="/dashboard/ads/create"><Megaphone className="h-4 w-4" /> Create ads</Link></Button>
                <Button asChild size="sm" variant="secondary"><Link href="/dashboard/projects/new"><Video className="h-4 w-4" /> Promo video</Link></Button>
                <Button asChild size="sm" variant="secondary"><Link href="/dashboard/seo/audit"><Search className="h-4 w-4" /> SEO audit</Link></Button>
              </div>
            </div>
          )}

          {tab === "pages" && (
            <div className="grid gap-3 lg:grid-cols-2">
              {pkg.pages.map((p, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{p.pageName}</h3><span className="text-[11px] text-muted-foreground">{p.sections.length} sections</span></div>
                  <p className="text-xs text-muted-foreground">{p.purpose}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{p.sections.map((s, j) => <span key={j} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{s}</span>)}</div>
                  <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
                    <p className="font-semibold">{p.copy.headline}</p>
                    <p className="text-xs text-muted-foreground">{p.copy.subhead}</p>
                    {p.copy.body && <p className="mt-1 text-xs">{p.copy.body}</p>}
                    <p className="mt-1 text-xs font-medium text-brand-600">CTA: {p.copy.cta}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {tab === "spec" && (
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Features</h3>
                <div className="mt-2 space-y-1.5">
                  {pkg.features.map((f, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 text-sm">
                      <span><strong>{f.name}</strong> <span className="text-muted-foreground">— {f.description}</span></span>
                      <span className="flex shrink-0 gap-1"><Badge variant={f.priority === "must" ? "danger" : f.priority === "should" ? "warning" : "default"}>{f.priority}</Badge><Badge variant="outline">P{f.phase}</Badge></span>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-4">
                  <h3 className="text-sm font-semibold">Database suggestion</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    {pkg.databaseSuggestion.map((d, i) => (
                      <div key={i}><span className="font-mono text-xs font-semibold">{d.table}</span> — <span className="text-muted-foreground">{d.purpose}</span>
                        <div className="text-[11px] text-muted-foreground">({d.keyFields.join(", ")})</div></div>
                    ))}
                  </div>
                </Card>
                <Card className="p-4">
                  <h3 className="text-sm font-semibold">Tech stack</h3>
                  <div className="mt-2 space-y-1.5 text-sm">
                    {pkg.techStack.map((t, i) => (
                      <div key={i}><strong>{t.layer}:</strong> {t.recommendation} <span className="text-xs text-muted-foreground">— {t.reason}</span></div>
                    ))}
                  </div>
                </Card>
              </div>
              <Card className="p-4">
                <h3 className="text-sm font-semibold">UI component plan</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">{pkg.uiComponentPlan.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}</div>
              </Card>
            </div>
          )}

          {tab === "sitemap" && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold">Sitemap</h3>
              <ul className="mt-3 space-y-1 font-mono text-sm">
                {pkg.sitemap.map((s, i) => (
                  <li key={i}>
                    <span className="text-brand-600">{s.path || "/"}</span> <span className="text-muted-foreground">— {s.label}</span>
                    {(s.children ?? []).length > 0 && (
                      <ul className="ml-6 mt-0.5 space-y-0.5">
                        {s.children!.map((c, j) => <li key={j}><span className="text-brand-600">{c.path}</span> <span className="text-muted-foreground">— {c.label}</span></li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tab === "roadmap" && (
            <div className="grid gap-3 lg:grid-cols-3">
              {pkg.roadmap.map((r) => (
                <Card key={r.phase} className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Phase {r.phase}: {r.title}</h3>
                    <Badge variant="outline">~{r.weeks}w</Badge>
                  </div>
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    {r.items.map((it, i) => <li key={i}>{it}</li>)}
                  </ul>
                </Card>
              ))}
            </div>
          )}

          {tab === "marketing" && (
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Channels</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">{pkg.marketingPlan.channels.map((c, i) => <Badge key={i} variant="brand">{c}</Badge>)}</div>
              </Card>
              <div className="grid gap-3 lg:grid-cols-3">
                {pkg.marketingPlan.launchPhases.map((ph, i) => (
                  <Card key={i} className="p-4">
                    <h3 className="text-sm font-semibold">{ph.phase}</h3>
                    <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">{ph.actions.map((a, j) => <li key={j}>{a}</li>)}</ul>
                  </Card>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="p-4">
                  <h3 className="text-sm font-semibold">Email sequence</h3>
                  <ol className="mt-2 list-inside list-decimal space-y-0.5 text-sm text-muted-foreground">{pkg.marketingPlan.emailSequence.map((e, i) => <li key={i}>{e}</li>)}</ol>
                </Card>
                <Card className="p-4">
                  <h3 className="text-sm font-semibold">SEO keywords</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">{pkg.seoKeywords.map((k, i) => <Badge key={i} variant="outline">{k}</Badge>)}</div>
                </Card>
                <Card className="p-4">
                  <h3 className="text-sm font-semibold">Blog topics</h3>
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">{pkg.blogTopics.map((b, i) => <li key={i}>{b}</li>)}</ul>
                </Card>
              </div>
            </div>
          )}

          {tab === "export" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => {
                  const md = packageToMarkdown(project.title, pkg);
                  const blob = new Blob([md], { type: "text/markdown" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${project.title.replace(/\s+/g, "-").toLowerCase()}-brief.md`;
                  a.click(); URL.revokeObjectURL(a.href);
                  void recordExport("markdown");
                }}><FileDown className="h-4 w-4" /> Markdown brief</Button>
                <Button size="sm" variant="secondary" onClick={() => {
                  const w = window.open("", "_blank");
                  if (!w) return;
                  const html = packageToMarkdown(project.title, pkg)
                    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
                    .replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>")
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/^- (.*)$/gm, "<li>$1</li>").replace(/\n/g, "<br/>");
                  w.document.write(`<html><head><title>${project.title}</title><style>body{font-family:system-ui;max-width:760px;margin:32px auto;line-height:1.5}</style></head><body>${html}<script>setTimeout(()=>window.print(),300)</script></body></html>`);
                  w.document.close();
                  void recordExport("pdf");
                }}><Printer className="h-4 w-4" /> PDF brief <span className="text-xs opacity-70">(1 credit)</span></Button>
                <Button size="sm" variant="secondary" onClick={async () => {
                  await navigator.clipboard.writeText(packageToMarkdown(project.title, pkg));
                  setCopied(true); setTimeout(() => setCopied(false), 1500);
                  void recordExport("prompt_package");
                }}>{copied ? <Check className="h-4 w-4 text-brand-600" /> : <Copy className="h-4 w-4" />} Copy prompt package</Button>
                <Button size="sm" variant="secondary" onClick={async () => {
                  const copyPkg = pkg.pages.map((p) => `## ${p.pageName}\nH1: ${p.copy.headline}\nSub: ${p.copy.subhead}\n${p.copy.body ?? ""}\nCTA: ${p.copy.cta}`).join("\n\n");
                  await navigator.clipboard.writeText(copyPkg);
                  setCopied(true); setTimeout(() => setCopied(false), 1500);
                  void recordExport("copy_package");
                }}><Copy className="h-4 w-4" /> Copy website copy</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The <strong>prompt package</strong> is designed to paste into Claude Code or any AI coding tool to implement the project.
              </p>
              <Alert variant="warning">{BUILD_DISCLAIMER}</Alert>
            </div>
          )}

          {tab === "publish" && (
            <SitePublishPanel projectId={project.id} generated={!!pkg} />
          )}
        </>
      )}
      {project && project.status === "generated" && (
        <ContentCompletionPanel
          contentType={project.project_type?.toLowerCase().includes("app") ? "app" : "website"}
          title={project.title}
          sourceKind="build"
          sourceId={project.id}
          baseMetadata={{ title: project.title, description: project.idea ?? undefined }}
        />
      )}
      <p className="text-[11px] text-muted-foreground">{BUILD_DISCLAIMER}</p>
    </div>
  );
}
