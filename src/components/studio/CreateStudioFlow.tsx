"use client";

import { useEffect, useMemo, useState } from "react";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import {
  FileText, Mic, Film, Eye, Send, Check, Lock, ArrowRight,
  CalendarClock, Sparkles, Download, CheckCircle2, Circle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { WorkflowActionBar, type WorkflowAction } from "@/components/workflow/WorkflowActionBar";
import { cn } from "@/lib/utils";
import type { Scene, Subtitle, Voiceover, RenderJob } from "@/lib/types";

// Lazy-load the heavy step editors CLIENT-SIDE. This keeps their large
// component graphs out of this route's SSR/build-time static-generation path
// (which previously bloated the shared build and broke public pages). Each is
// interactive-only, so client rendering is the right call regardless.
const StepLoading = () => (
  <Card className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
    <Spinner className="h-4 w-4" /> Loading…
  </Card>
);
const ScriptGenerator = nextDynamic(() => import("@/components/dashboard/ScriptGenerator").then((m) => m.ScriptGenerator), { ssr: false, loading: StepLoading });
const VoiceStudio = nextDynamic(() => import("@/components/dashboard/VoiceStudio").then((m) => m.VoiceStudio), { ssr: false, loading: StepLoading });
const SceneBuilder = nextDynamic(() => import("@/components/dashboard/SceneBuilder").then((m) => m.SceneBuilder), { ssr: false, loading: StepLoading });
const RenderQueue = nextDynamic(() => import("@/components/dashboard/RenderQueue").then((m) => m.RenderQueue), { ssr: false, loading: StepLoading });
const ContentCompletionPanel = nextDynamic(() => import("@/components/publishing/ContentCompletionPanel").then((m) => m.ContentCompletionPanel), { ssr: false, loading: StepLoading });

export type StudioProject = { id: string; title: string; category: string; idea: string | null; status: string };

type StepId = "script" | "voiceover" | "video" | "preview" | "publish";

const STEPS: { id: StepId; label: string; icon: typeof FileText; blurb: string }[] = [
  { id: "script", label: "Script", icon: FileText, blurb: "Turn your idea into a structured, scene-ready script." },
  { id: "voiceover", label: "Voiceover", icon: Mic, blurb: "Give your video a natural AI narration — pick a voice, language, and pace." },
  { id: "video", label: "Video", icon: Film, blurb: "Build scenes with visuals and captions, then render everything into an MP4." },
  { id: "preview", label: "Preview", icon: Eye, blurb: "Watch the finished video and check it before it goes anywhere." },
  { id: "publish", label: "Schedule & Publish", icon: Send, blurb: "Publish now, schedule for later, or promote — to YouTube and beyond." },
];

export function CreateStudioFlow({
  project,
  scripts,
  latestScriptText,
  scenes,
  subtitle,
  voiceovers,
  renderJobs,
  renderLive,
  initialStep,
}: {
  project: StudioProject;
  scripts: { id: string; content: string; model: string; created_at: string }[];
  latestScriptText: string;
  scenes: Scene[];
  subtitle: Subtitle | null;
  voiceovers: Voiceover[];
  renderJobs: RenderJob[];
  renderLive: boolean;
  initialStep?: string;
}) {
  // What's already done, from the data we loaded.
  const hasScript = scripts.length > 0;
  const hasVoiceover = voiceovers.length > 0;
  const renderedUrl = useMemo(
    () => renderJobs.find((j) => j.output_url && j.output_url.startsWith("http"))?.output_url ?? null,
    [renderJobs]
  );
  const hasVideo = !!renderedUrl;

  const done: Record<StepId, boolean> = {
    script: hasScript,
    voiceover: hasVoiceover,
    video: hasVideo,
    preview: hasVideo,
    publish: false,
  };

  const validInitial = STEPS.some((s) => s.id === initialStep) ? (initialStep as StepId) : null;
  // Land on the first unfinished step, or the requested one.
  const firstTodo = STEPS.find((s) => !done[s.id])?.id ?? "publish";
  const [active, setActive] = useState<StepId>(validInitial ?? firstTodo);

  const activeIdx = STEPS.findIndex((s) => s.id === active);
  const activeStep = STEPS[activeIdx];

  // Record workflow state so this project appears in "Continue where you left off".
  useEffect(() => {
    const completedSteps = hasVideo ? ["create"] : [];
    fetch("/api/workflow/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectType: "ai_video",
        projectId: project.id,
        title: project.title,
        completedSteps,
        currentStep: hasVideo ? "review" : "create",
        lastAction: "Working in Create Studio",
      }),
    }).catch(() => {});
  }, [project.id, project.title, hasVideo]);

  function go(step: StepId) {
    setActive(step);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Sticky action bar: consistent Back + primary "Next step" across every step.
  const back: WorkflowAction | undefined = activeIdx > 0
    ? { id: "back", label: `Back: ${STEPS[activeIdx - 1].label}` }
    : undefined;

  let primary: WorkflowAction;
  if (activeIdx < STEPS.length - 1) {
    const next = STEPS[activeIdx + 1];
    primary = { id: "next", label: `Next: ${next.label}`, icon: <ArrowRight className="h-4 w-4" />, onClick: () => go(next.id) };
  } else {
    primary = { id: "calendar", label: "View publishing calendar", icon: <CalendarClock className="h-4 w-4" />, href: "/dashboard/calendar" };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Create Studio</p>
          <h1 className="mt-0.5 text-2xl font-bold">{project.title}</h1>
          {project.idea && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.idea}</p>}
        </div>
        <Link href={`/dashboard/projects/${project.id}`} className="text-sm text-muted-foreground hover:underline">
          Project details
        </Link>
      </div>

      {/* Production stepper */}
      <StudioStepper active={active} activeIdx={activeIdx} done={done} onStep={go} />

      {/* Step guidance */}
      <div className="rounded-xl border border-brand-500/25 bg-brand-50/50 p-4 dark:bg-brand-900/10">
        <div className="flex items-center gap-2">
          <activeStep.icon className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold">
            Step {activeIdx + 1} of {STEPS.length}: {activeStep.label}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{activeStep.blurb}</p>
      </div>

      {/* Active step body */}
      <div className="min-h-[240px]">
        {active === "script" && (
          <ScriptGenerator
            projects={[{ id: project.id, title: project.title, category: project.category, idea: project.idea }]}
            initialProjectId={project.id}
          />
        )}

        {active === "voiceover" && (
          !hasScript
            ? <NeedPrevious label="Generate a script first" hint="Your narration comes from the script." onGo={() => go("script")} goLabel="Go to Script" />
            : <VoiceStudio projectId={project.id} defaultText={latestScriptText} voiceovers={voiceovers} />
        )}

        {active === "video" && (
          !hasScript
            ? <NeedPrevious label="Generate a script first" hint="Scenes are built from your saved script." onGo={() => go("script")} goLabel="Go to Script" />
            : (
              <div className="space-y-6">
                <SceneBuilder projectId={project.id} initialScenes={scenes} hasScript={hasScript} initialSubtitle={subtitle} />
                <div className="border-t border-border pt-6">
                  <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><Film className="h-4 w-4" /> Render to video</h3>
                  <RenderQueue projectId={project.id} jobs={renderJobs} live={renderLive} showCompletionPanel={false} />
                </div>
              </div>
            )
        )}

        {active === "preview" && (
          <PreviewStep renderedUrl={renderedUrl} subtitle={subtitle} onGoVideo={() => go("video")} onGoPublish={() => go("publish")} />
        )}

        {active === "publish" && (
          !hasVideo
            ? <NeedPrevious label="Render a video first" hint="Once your MP4 is ready you can publish or schedule it." onGo={() => go("video")} goLabel="Go to Video" />
            : (
              <ContentCompletionPanel
                contentType="ai_video"
                sourceKind="video"
                sourceId={project.id}
                title={project.title}
                assetUrl={renderedUrl}
                previewUrl={renderedUrl}
                downloadUrl={renderedUrl}
                baseMetadata={{ title: project.title, description: project.idea ?? undefined }}
              />
            )
        )}
      </div>

      <WorkflowActionBar
        back={back ? { label: back.label, onClick: () => go(STEPS[activeIdx - 1].id) } : undefined}
        primary={primary}
        secondary={activeIdx === STEPS.length - 1 ? [] : [{ id: "skip", label: "Do this later", variant: "ghost", onClick: () => go(STEPS[Math.min(activeIdx + 1, STEPS.length - 1)].id) }]}
      />
    </div>
  );
}

/** Horizontal production stepper — every step is clickable, completed steps show a check. */
function StudioStepper({
  active, activeIdx, done, onStep,
}: {
  active: StepId; activeIdx: number; done: Record<StepId, boolean>; onStep: (s: StepId) => void;
}) {
  return (
    <nav aria-label="Production steps" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const isDone = done[s.id];
          const isActive = s.id === active;
          const state = isDone ? "Completed" : isActive ? "Current" : "Upcoming";
          return (
            <li key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onStep(s.id)}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${s.label}. ${state}.`}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                  isActive && "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isDone ? "bg-brand-600 text-white"
                      : isActive ? "border-2 border-brand-600 text-brand-700 dark:text-brand-300"
                        : "border border-border text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn("font-medium", isActive || isDone ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span aria-hidden className={cn("mx-0.5 h-px w-4 sm:w-6", i < activeIdx || done[s.id] ? "bg-brand-600" : "bg-border")} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function NeedPrevious({ label, hint, onGo, goLabel }: { label: string; hint: string; onGo: () => void; goLabel: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <Lock className="h-7 w-7 text-muted-foreground" />
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>
      <button onClick={onGo} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        <ArrowRight className="h-4 w-4" /> {goLabel}
      </button>
    </Card>
  );
}

function PreviewStep({
  renderedUrl, subtitle, onGoVideo, onGoPublish,
}: {
  renderedUrl: string | null; subtitle: Subtitle | null; onGoVideo: () => void; onGoPublish: () => void;
}) {
  if (!renderedUrl) {
    return <NeedPrevious label="No rendered video yet" hint="Build scenes and render an MP4 in the Video step, then come back to preview it." onGo={onGoVideo} goLabel="Go to Video" />;
  }
  const checks = [
    { ok: true, label: "Video rendered to MP4" },
    { ok: !!subtitle, label: subtitle ? "Captions generated" : "Captions not added (optional)" },
  ];
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video controls src={renderedUrl} className="w-full rounded-lg bg-black" />
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.open(renderedUrl, "_blank")}
            className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
          >
            <Eye className="h-4 w-4" /> Open full screen
          </button>
          <a href={renderedUrl} download className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
            <Download className="h-4 w-4" /> Download MP4
          </a>
        </div>
      </Card>

      <Card className="space-y-2">
        <h3 className="text-sm font-semibold">Pre-flight check</h3>
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              {c.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
              <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onGoPublish}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Sparkles className="h-4 w-4" /> Looks good — schedule & publish
        </button>
      </Card>
    </div>
  );
}
