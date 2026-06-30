"use client";

import { useState } from "react";
import Link from "next/link";
import { Wand2, Star, Sparkles, Clapperboard, Megaphone, Image as ImageIcon, FileText, MessageSquare, Mic, Workflow, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { CATEGORY_GROUPS } from "@/config/contentCategories";
import { WORKFLOWS } from "@/config/contentWorkflows";
import { CONTENT_TEMPLATES, TEMPLATE_PLATFORMS, TEMPLATE_OUTPUTS } from "@/config/contentTemplates";
import { BrandIcon, hasBrandIcon } from "@/components/icons/BrandIcon";

const sel = "h-9 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

// Each template's group maps to one Lucide glyph — replaces ad-hoc emoji on cards.
const GROUP_ICON: Record<string, LucideIcon> = {
  video: Clapperboard, ad: Megaphone, image: ImageIcon, seo: FileText,
  social: MessageSquare, audio: Mic, automation: Workflow,
};

export function TemplatesGallery({ initialGroup }: { initialGroup?: string }) {
  const [group, setGroup] = useState(initialGroup && CATEGORY_GROUPS.some((g) => g.id === initialGroup) ? initialGroup : "all");
  const [workflow, setWorkflow] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [output, setOutput] = useState("all");
  const [popular, setPopular] = useState(false);
  const [fresh, setFresh] = useState(false);

  const list = CONTENT_TEMPLATES.filter((t) => {
    if (group !== "all" && t.group !== group) return false;
    if (workflow !== "all" && t.workflowType !== workflow) return false;
    if (platform !== "all" && !t.platforms.includes(platform)) return false;
    if (output !== "all" && t.output !== output) return false;
    if (popular && !t.featured) return false;
    if (fresh && !t.isNew) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select className={sel} value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="all">All groups</option>
          {CATEGORY_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className={sel} value={workflow} onChange={(e) => setWorkflow(e.target.value)}>
          <option value="all">All workflows</option>
          {Object.entries(WORKFLOWS).map(([k, w]) => <option key={k} value={k}>{w.label}</option>)}
        </select>
        <select className={sel} value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          {TEMPLATE_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className={sel} value={output} onChange={(e) => setOutput(e.target.value)}>
          <option value="all">All outputs</option>
          {TEMPLATE_OUTPUTS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button onClick={() => setPopular((v) => !v)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", popular ? "border-brand-600 bg-brand-600 text-white" : "border-border")}><Star className="h-3.5 w-3.5" /> Popular</button>
        <button onClick={() => setFresh((v) => !v)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", fresh ? "border-brand-600 bg-brand-600 text-white" : "border-border")}><Sparkles className="h-3.5 w-3.5" /> New</button>
        <span className="ml-auto text-sm text-muted-foreground">{list.length} template{list.length === 1 ? "" : "s"}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((t) => {
          const GroupIcon = GROUP_ICON[t.group] ?? Sparkles;
          const brandPlatforms = t.platforms.filter((p) => hasBrandIcon(p));
          return (
          <Link key={t.id} href={t.route}>
            <Card className="group h-full transition-colors hover:border-brand-400">
              <div className="relative flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-brand-100 to-muted">
                <GroupIcon className="h-10 w-10 text-brand-700" aria-hidden />
                {brandPlatforms.length > 0 && (
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    {brandPlatforms.slice(0, 3).map((p) => (
                      <span key={p} className="flex h-5 w-5 items-center justify-center rounded-full bg-background/90 shadow-sm" title={p}>
                        <BrandIcon platform={p} className="h-3 w-3" />
                      </span>
                    ))}
                  </div>
                )}
                {t.featured && <span className="absolute left-2 top-2 rounded-full bg-brand-300 px-2 py-0.5 text-[10px] font-semibold text-brand-900">Popular</span>}
                {t.isNew && <span className="absolute right-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">New</span>}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.name}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-brand-700 opacity-0 transition-opacity group-hover:opacity-100"><Wand2 className="h-3.5 w-3.5" /> Use</span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                <div className="flex flex-wrap gap-1 pt-1 text-[10px] text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5">{t.output}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">{t.groupName.replace("AI ", "")}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">~{t.estimatedCredits} cr</span>
                </div>
              </div>
            </Card>
          </Link>
          );
        })}
        {list.length === 0 && <p className="text-sm text-muted-foreground">No templates match those filters.</p>}
      </div>
    </div>
  );
}
