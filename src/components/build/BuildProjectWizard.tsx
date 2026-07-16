"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Coins, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import {
  BUILD_GROUPS, BUILD_GOALS, BUILD_STYLES, BUILD_CREDIT_COSTS,
  getBuildTypesForGroup, getBuildTypeBySlug,
} from "@/config/buildStudio";
import { BUILD_DISCLAIMER } from "@/lib/build/package";

const STEPS = ["Project type", "Your idea", "Audience", "Goal", "Style", "Generate"];

export function BuildProjectWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const presetType = params.get("type") ?? "";
  const presetIdea = params.get("idea") ?? "";

  const [step, setStep] = useState(presetType ? 1 : 0);
  const [group, setGroup] = useState(getBuildTypeBySlug(presetType)?.group ?? BUILD_GROUPS[0].id);
  const [type, setType] = useState(presetType);
  const [idea, setIdea] = useState(presetIdea);
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState<string>(BUILD_GOALS[0]);
  const [style, setStyle] = useState<string>(BUILD_STYLES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext = useMemo(() => {
    if (step === 0) return !!type;
    if (step === 1) return idea.trim().length > 10;
    return true;
  }, [step, type, idea]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const projRes = await fetch("/api/build/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: idea.slice(0, 60), category: group, projectType: type,
          idea, targetAudience: audience || undefined, goal, style,
        }),
      });
      const projJson = await projRes.json();
      if (!projRes.ok) throw new Error(projJson.error ?? "Failed to create project");
      const projectId: string = projJson.project.id;

      const genRes = await fetch("/api/build/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }),
      });
      if (genRes.status === 402) throw new Error("Not enough credits. Top up in Credit Wallet.");
      const raw = await genRes.text();
      try { JSON.parse(raw); } catch { throw new Error("Generation took too long — open the project and retry."); }
      if (!genRes.ok) throw new Error(JSON.parse(raw).error ?? "Generation failed");

      router.push(`/dashboard/build/editor?project=${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${i === step ? "bg-brand-100 text-brand-900 dark:bg-brand-950/40" : i < step ? "text-brand-600" : "text-muted-foreground"}`}>
            {i < step ? <Check className="h-3 w-3" /> : <span className="font-semibold">{i + 1}</span>} {s}
          </li>
        ))}
      </ol>

      <div className="min-h-[280px] rounded-xl border border-border bg-card p-5">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold">What are you building?</h2>
            <div className="flex flex-wrap gap-2">
              {BUILD_GROUPS.map((g) => (
                <button key={g.id} onClick={() => setGroup(g.id)} className={`rounded-full border px-3 py-1.5 text-sm ${g.id === group ? "border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-950/30" : "border-border text-muted-foreground hover:bg-muted"}`}>{g.name}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {getBuildTypesForGroup(group).map((t) => (
                <button key={t.slug} onClick={() => setType(t.slug)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${t.slug === type ? "border-brand-500 ring-1 ring-brand-500" : "border-border hover:bg-muted"}`}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Describe your idea</h2>
            <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={5}
              placeholder="e.g. A SaaS that helps freelance designers create proposals, get them signed, and collect deposits — subscription pricing, targeting solo designers"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500" />
            <p className="text-xs text-muted-foreground">The more specific you are (who it is for, what it does, how it makes money), the better the package.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Who is the target audience?</h2>
            <input value={audience} onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Solo freelance designers earning $2-10k/month"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500" />
            <p className="text-xs text-muted-foreground">Optional but strongly recommended — copy and positioning are written for this audience.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold">What is the primary goal?</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BUILD_GOALS.map((g) => (
                <button key={g} onClick={() => setGoal(g)} className={`rounded-lg border p-3 text-sm ${g === goal ? "border-brand-500 ring-1 ring-brand-500" : "border-border hover:bg-muted"}`}>{g}</button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Pick a style direction</h2>
            <div className="grid grid-cols-3 gap-2">
              {BUILD_STYLES.map((s) => (
                <button key={s} onClick={() => setStyle(s)} className={`rounded-lg border p-3 text-sm ${s === style ? "border-brand-500 ring-1 ring-brand-500" : "border-border hover:bg-muted"}`}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Review & generate</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Type</dt><dd>{getBuildTypeBySlug(type)?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Goal</dt><dd>{goal}</dd>
              <dt className="text-muted-foreground">Style</dt><dd>{style}</dd>
              <dt className="text-muted-foreground">Audience</dt><dd>{audience || "—"}</dd>
              <dt className="text-muted-foreground">Idea</dt><dd className="line-clamp-2">{idea}</dd>
            </dl>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5" /> ~{BUILD_CREDIT_COSTS.fullPackage} credits for the full package (only charged if AI runs)
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <Button onClick={generate} disabled={busy} className="w-full">
              {busy ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />}
              {busy ? "Generating your project package… (~30s)" : "Generate full project package"}
            </Button>
            <p className="text-[11px] text-muted-foreground">{BUILD_DISCLAIMER}</p>
          </div>
        )}
      </div>

      {step < 5 ? (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>
          <Button onClick={() => setStep((s) => Math.min(5, s + 1))} disabled={!canNext}>Next <ArrowRight className="h-4 w-4" /></Button>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setStep(4)} disabled={busy}><ArrowLeft className="h-4 w-4" /> Back</Button>
      )}
    </div>
  );
}
