"use client";

import { useCallback, useMemo, useState } from "react";
import { Building2, Coins, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import {
  RE_OUTPUT_TYPES, RE_PROJECT_TYPES, RE_PROPERTY_TYPES, RE_DESIGN_STYLES, RE_ROOF_STYLES,
  RE_DISCLAIMER, getReOutputType,
} from "@/config/industrySuites";
import type { IndustryTemplate } from "@/config/industryTemplates";
import type { RealEstateConcept } from "@/lib/design/realestate";
import { RealEstateConceptView } from "./RealEstateConceptView";

type Form = {
  projectName: string; projectType: string; propertyType: string; country: string; city: string;
  climate: string; plotSize: string; floors: string; bedrooms: string; bathrooms: string;
  designStyle: string; budget: string; targetMarket: string; interiorStyle: string;
  exteriorStyle: string; roofStyle: string; materials: string; landscapePreference: string;
  brandName: string; outputType: string; goal: string;
};

const BLANK: Form = {
  projectName: "", projectType: RE_PROJECT_TYPES[0], propertyType: RE_PROPERTY_TYPES[0],
  country: "", city: "", climate: "", plotSize: "", floors: "", bedrooms: "", bathrooms: "",
  designStyle: RE_DESIGN_STYLES[0], budget: "", targetMarket: "", interiorStyle: "",
  exteriorStyle: "", roofStyle: RE_ROOF_STYLES[0], materials: "", landscapePreference: "",
  brandName: "", outputType: "concept_prompt", goal: "",
};

/** Real Estate Design Wizard — guided inputs → structured AI concept. Accepts
 *  an optional template to preseed the brief and output type. */
export function RealEstateWizard({ template, category }: { template?: IndustryTemplate; category?: string }) {
  const [form, setForm] = useState<Form>({
    ...BLANK,
    projectName: template ? template.name : "",
    goal: template?.defaultPrompt ?? "",
    outputType: template?.outputType ?? "concept_prompt",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ concept: RealEstateConcept; projectId: string | null; usedAI: boolean; creditsUsed: number } | null>(null);

  const cost = useMemo(
    () => template?.estimatedCredits ?? getReOutputType(form.outputType).credits,
    [form.outputType, template]
  );

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const generate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // 1. Create the project record.
      const projRes = await fetch("/api/design/realestate/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          floors: form.floors ? Number(form.floors) : undefined,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        }),
      });
      const projJson = await projRes.json();
      if (!projRes.ok) throw new Error(projJson.error ?? "Failed to create project");
      const projectId: string = projJson.project.id;

      // 2. Generate the structured concept.
      const genRes = await fetch("/api/design/realestate/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, projectId, category,
          floors: form.floors ? Number(form.floors) : undefined,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        }),
      });
      if (genRes.status === 402) throw new Error("Not enough credits. Top up in Credit Wallet.");
      const genJson = await genRes.json();
      if (!genRes.ok) throw new Error(genJson.error ?? "Generation failed");
      setResult({ concept: genJson.concept, projectId, usedAI: genJson.usedAI, creditsUsed: genJson.creditsUsed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, [form, category]);

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{form.projectName || "Property concept"}</h2>
            <p className="text-xs text-muted-foreground">
              {result.usedAI ? `Generated with AI · ${result.creditsUsed} credits` : "Placeholder concept (no AI key configured) · free"}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setResult(null)}>New concept</Button>
        </div>
        <RealEstateConceptView concept={result.concept} projectName={form.projectName || "Property concept"} projectId={result.projectId} />
      </div>
    );
  }

  const input = (label: string, k: keyof Form, placeholder = "", type = "text") => (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">{label}</span>
      <input type={type} value={form[k]} onChange={set(k)} placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
    </label>
  );
  const select = (label: string, k: keyof Form, options: string[]) => (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">{label}</span>
      <select value={form[k]} onChange={set(k)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <form onSubmit={generate} className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-brand-600" /> Project basics
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {input("Project name *", "projectName", "Sunrise Villa")}
          {select("Project type", "projectType", RE_PROJECT_TYPES)}
          {select("Property type", "propertyType", RE_PROPERTY_TYPES)}
          {input("Country", "country", "e.g. Australia")}
          {input("City", "city", "e.g. Sydney")}
          {input("Climate", "climate", "e.g. Coastal temperate")}
          {input("Plot size", "plotSize", "e.g. 600 sqm")}
          {input("Floors", "floors", "2", "number")}
          {input("Bedrooms", "bedrooms", "4", "number")}
          {input("Bathrooms", "bathrooms", "3", "number")}
          {input("Construction budget", "budget", "e.g. $850k")}
          {input("Target market", "targetMarket", "e.g. Young families")}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">Design direction</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {select("Design style", "designStyle", RE_DESIGN_STYLES)}
          {input("Interior style", "interiorStyle", "e.g. Warm minimalist")}
          {input("Exterior style", "exteriorStyle", "e.g. Contemporary")}
          {select("Roof style", "roofStyle", RE_ROOF_STYLES)}
          {input("Preferred materials", "materials", "e.g. Timber, stone, glass")}
          {input("Landscape preference", "landscapePreference", "e.g. Native garden + pool")}
          {input("Brand name (optional)", "brandName", "e.g. Horizon Estates")}
        </div>
        <label className="mt-3 block">
          <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Brief / goal</span>
          <textarea value={form.goal} onChange={set("goal")} rows={2}
            placeholder="Describe what you want this concept to achieve"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">Output type</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {RE_OUTPUT_TYPES.map((o) => (
            <button
              key={o.id} type="button"
              onClick={() => setForm((f) => ({ ...f, outputType: o.id }))}
              className={`rounded-lg border p-2.5 text-left text-sm ${form.outputType === o.id ? "border-brand-500 ring-1 ring-brand-500" : "border-border hover:bg-muted"}`}
            >
              <div className="font-medium">{o.label}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Coins className="h-3 w-3" /> ~{o.credits} credits</div>
            </button>
          ))}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <Coins className="h-3.5 w-3.5" /> Estimated ~{cost} credits (only charged if AI runs)
        </span>
        <Button type="submit" disabled={busy || !form.projectName.trim()}>
          {busy ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Generating concept…" : "Generate concept"}
        </Button>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {RE_DISCLAIMER}
      </p>
    </form>
  );
}
