"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, PenLine, Sparkles, FileText, ListChecks, Megaphone, Download, ArrowRight, Check, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { GuidedStepper } from "@/components/studio/GuidedStepper";
import { BUILD_CREDIT_COSTS } from "@/config/buildStudio";

type Journey = {
  providers: { ai: boolean };
  counts: { projects: number; generated: number };
};

const STEPS = [
  { id: "choose", label: "Choose what to build", route: "/dashboard/build/templates", icon: LayoutTemplate, blurb: "Pick a website type — business site, portfolio, blog — or start from a template." },
  { id: "describe", label: "Describe your idea", route: "/dashboard/build/new", icon: PenLine, blurb: "Tell us the idea, who it's for, your goal and the style you want." },
  { id: "generate", label: "Generate the blueprint", route: "/dashboard/build/new", icon: Sparkles, blurb: `AI writes your structure, pages, real copy, sitemap and tech stack (${BUILD_CREDIT_COSTS.fullPackage} credits).` },
  { id: "review", label: "Review & edit", route: "/dashboard/build/editor", icon: FileText, blurb: "Refine the pages, headlines, body copy and feature list until it's right." },
  { id: "roadmap", label: "Plan the build", route: "/dashboard/build/roadmap", icon: ListChecks, blurb: "A phased roadmap — what to build first, second and later." },
  { id: "marketing", label: "Plan the launch", route: "/dashboard/build/marketing", icon: Megaphone, blurb: "Launch phases, channels and an email sequence to get your first visitors." },
  { id: "export", label: "Export the brief", route: "/dashboard/build/export", icon: Download, blurb: "Download the developer brief — hand it to a developer, a site builder, or an AI coding tool." },
] as const;

function isDone(id: string, c: Journey["counts"]): boolean {
  switch (id) {
    case "choose":
    case "describe":
      return c.projects > 0;
    default:
      // Everything from "generate" on unlocks once a blueprint exists.
      return c.generated > 0;
  }
}

export function BuildJourney() {
  const router = useRouter();
  const [data, setData] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/build/journey")
      .then((r) => r.json())
      .then((j) => { if (j.counts) setData(j); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="flex items-center justify-center py-10"><Spinner className="h-5 w-5" /></Card>;
  if (!data) return null;

  const doneIds = STEPS.filter((s) => isDone(s.id, data.counts)).map((s) => s.id);
  const active = STEPS.find((s) => !doneIds.includes(s.id)) ?? STEPS[STEPS.length - 1];
  const ActiveIcon = active.icon;
  const allDone = doneIds.length === STEPS.length;

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="text-lg font-semibold">How Build Studio works</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Seven steps from an idea to a complete, ready-to-build website plan. Follow them in order — we track your progress automatically.
        </p>
      </div>

      {/* What you actually get — set expectations before they spend credits. */}
      <Alert variant="info" title="What you get">
        A complete <strong>blueprint</strong>: structure, pages with real copy, sitemap, features, tech stack, roadmap and a launch plan — exported as a developer brief.
        Build Studio <strong>plans</strong> your site; it doesn&rsquo;t host or deploy a live website. Take the brief to your developer, a site builder, or an AI coding tool to put it online.
      </Alert>

      <GuidedStepper
        steps={STEPS.map((s) => ({ id: s.id, label: s.label }))}
        activeId={active.id}
        doneIds={doneIds}
        onStep={(id) => { const s = STEPS.find((x) => x.id === id); if (s) router.push(s.route); }}
      />

      {/* Current step callout */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-brand-300">
          <ActiveIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {allDone ? "Your blueprint is ready — review, plan and export it" : `Next: ${active.label}`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{active.blurb}</p>
        </div>
        <Button size="sm" onClick={() => router.push(active.route)}>
          {allDone ? "Open" : "Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Every step, spelled out */}
      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = doneIds.includes(s.id);
          return (
            <li key={s.id}>
              <button
                onClick={() => router.push(s.route)}
                className="flex w-full items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> {s.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{s.blurb}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Honest status + costs */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${data.providers.ai ? "bg-emerald-500" : "bg-amber-500"}`} />
          AI generator: <strong className="text-foreground">{data.providers.ai ? "Live" : "Not configured"}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" aria-hidden />
          Blueprint {BUILD_CREDIT_COSTS.fullPackage} credits · exporting is free
        </span>
      </div>
    </Card>
  );
}
