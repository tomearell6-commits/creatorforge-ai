"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Coins, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { DESIGN_GROUPS, DESIGN_FORMATS, DESIGN_STYLES, getCategoriesForGroup, getDesignCategoryBySlug, getDesignFormat } from "@/config/designStudio";
import { BrandKitSelector, type BrandKit } from "./BrandKitSelector";

const STEPS = ["Category", "Format", "Goal", "Style", "Brand Kit", "Generate"];

export function DesignProjectWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("category") ?? undefined;

  const [step, setStep] = useState(preset ? 1 : 0);
  const [group, setGroup] = useState(getDesignCategoryBySlug(preset ?? "")?.group ?? DESIGN_GROUPS[0].id);
  const [category, setCategory] = useState<string>(preset ?? "");
  const [format, setFormat] = useState<string>(getDesignCategoryBySlug(preset ?? "")?.format ?? "square-1-1");
  const [goal, setGoal] = useState("");
  const [style, setStyle] = useState("minimal");
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cat = getDesignCategoryBySlug(category);
  const fmt = getDesignFormat(format);
  const creditEstimate = cat?.credits ?? 6;

  const canNext = useMemo(() => {
    if (step === 0) return !!category;
    if (step === 2) return goal.trim().length > 2;
    return true;
  }, [step, category, goal]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const projRes = await fetch("/api/design/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cat?.name ? `${cat.name} — ${goal.slice(0, 30)}` : goal.slice(0, 40),
          category, format, style, goal, width: fmt.width, height: fmt.height,
          brandKitId: brandKit?.id,
        }),
      });
      const projJson = await projRes.json();
      if (!projRes.ok) throw new Error(projJson.error ?? "Failed to create project");
      const projectId: string = projJson.project.id;

      const genRes = await fetch("/api/design/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, category, format, goal, style, width: fmt.width, height: fmt.height, brandKitId: brandKit?.id }),
      });
      if (genRes.status === 402) throw new Error("Not enough credits to generate this concept. Top up in Credit Wallet.");
      const genJson = await genRes.json();
      if (!genRes.ok) throw new Error(genJson.error ?? "Generation failed");

      // Persist the generated concept's layers so the editor opens with them.
      const layers = genJson.concept.layers ?? [];
      if (layers.length) {
        await fetch("/api/design/layers", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, layers }),
        });
      }
      router.push(`/dashboard/design/editor?project=${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Progress */}
      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${i === step ? "bg-brand-100 text-brand-700 dark:bg-brand-950/40" : i < step ? "text-brand-600" : "text-muted-foreground"}`}>
            {i < step ? <Check className="h-3 w-3" /> : <span className="font-semibold">{i + 1}</span>} {s}
          </li>
        ))}
      </ol>

      <div className="min-h-[280px] rounded-xl border border-border bg-card p-5">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Choose a design category</h2>
            <div className="flex flex-wrap gap-2">
              {DESIGN_GROUPS.map((g) => (
                <button key={g.id} onClick={() => setGroup(g.id)} className={`rounded-full border px-3 py-1.5 text-sm ${g.id === group ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30" : "border-border text-muted-foreground hover:bg-muted"}`}>{g.name}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {getCategoriesForGroup(group).map((c) => (
                <button key={c.slug} onClick={() => { setCategory(c.slug); setFormat(c.format); }}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${c.slug === category ? "border-brand-500 ring-1 ring-brand-500" : "border-border hover:bg-muted"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Choose a format</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DESIGN_FORMATS.map((f) => (
                <button key={f.id} onClick={() => setFormat(f.id)} className={`rounded-lg border p-3 text-left ${f.id === format ? "border-brand-500 ring-1 ring-brand-500" : "border-border hover:bg-muted"}`}>
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.ratio} · {f.width}×{f.height}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-semibold">What is the goal of this design?</h2>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={4}
              placeholder="e.g. Announce a 48-hour flash sale on our new running shoes, upbeat and urgent"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500" />
            <p className="text-xs text-muted-foreground">Be specific — the AI uses this to write your copy and choose a layout.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Select a style</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DESIGN_STYLES.map((s) => (
                <button key={s.id} onClick={() => setStyle(s.id)} className={`rounded-lg border p-3 text-left ${s.id === style ? "border-brand-500 ring-1 ring-brand-500" : "border-border hover:bg-muted"}`}>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Apply a brand kit <span className="font-normal text-muted-foreground">(optional)</span></h2>
            {brandKit && <Alert variant="success">Using <strong>{brandKit.name}</strong>. <button className="underline" onClick={() => setBrandKit(null)}>Remove</button></Alert>}
            <BrandKitSelector onSelect={setBrandKit} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Review & generate</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Category</dt><dd>{cat?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Format</dt><dd>{fmt.label} · {fmt.width}×{fmt.height}</dd>
              <dt className="text-muted-foreground">Style</dt><dd className="capitalize">{style}</dd>
              <dt className="text-muted-foreground">Brand kit</dt><dd>{brandKit?.name ?? "None"}</dd>
              <dt className="text-muted-foreground">Goal</dt><dd className="line-clamp-2">{goal}</dd>
            </dl>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5" /> Estimated ~{creditEstimate} credits (only charged if AI runs)
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <Button onClick={generate} disabled={busy} className="w-full">
              {busy ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />}
              {busy ? "Generating your design…" : "Generate design concept"}
            </Button>
          </div>
        )}
      </div>

      {/* Nav */}
      {step < 5 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>
          <Button onClick={() => setStep((s) => Math.min(5, s + 1))} disabled={!canNext}>Next <ArrowRight className="h-4 w-4" /></Button>
        </div>
      )}
      {step === 5 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep(4)} disabled={busy}><ArrowLeft className="h-4 w-4" /> Back</Button>
        </div>
      )}
    </div>
  );
}
