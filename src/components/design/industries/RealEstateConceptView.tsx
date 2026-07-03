"use client";

import { useCallback, useState } from "react";
import { FileDown, Printer, Copy, Check, AlertTriangle, Clapperboard, Video, Megaphone, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { RealEstateConcept } from "@/lib/design/realestate";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-1.5 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function conceptToHtml(c: RealEstateConcept, projectName: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const list = (items: string[]) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  return `
    <h1>${esc(projectName)}</h1>
    <p><em>${esc(c.projectSummary)}</em></p>
    <h2>Design Concept</h2><p>${esc(c.designConcept)}</p>
    <h2>Style Direction</h2><p>${esc(c.styleDirection)}</p>
    <h2>Suggested Materials</h2>${list(c.suggestedMaterials)}
    <h2>Color Palette</h2><p>${c.colorPalette.map((h) => `<span style="display:inline-block;width:60px;height:24px;background:${esc(h)};border:1px solid #ccc;margin-right:4px" title="${esc(h)}"></span>`).join("")}</p>
    <h2>Space Planning Notes (conceptual)</h2>${list(c.spacePlanningNotes)}
    <h2>Image Prompts</h2>
    <p><strong>Interior:</strong> ${esc(c.interiorPrompt)}</p>
    <p><strong>Exterior:</strong> ${esc(c.exteriorPrompt)}</p>
    <p><strong>Landscape:</strong> ${esc(c.landscapePrompt)}</p>
    <h2>Marketing Copy</h2><p>${esc(c.marketingCopy)}</p>
    <h2>Listing Description</h2><p>${esc(c.listingDescription)}</p>
    <h2>Social Captions</h2>${list(c.socialCaptions.map((s) => `${s.platform}: ${s.text}`))}
    <h2>Video Storyboard</h2>${list(c.videoStoryboard.map((s) => `${s.shot} (${s.durationSeconds}s): ${s.description}`))}
    <h2>Walkthrough Script</h2><p>${esc(c.walkthroughScript)}</p>
    <hr/><p style="font-size:12px;color:#666">${esc(c.disclaimer)}</p>`;
}

/** Structured display of a generated RealEstateConcept with export actions. */
export function RealEstateConceptView({
  concept, projectName, projectId,
}: {
  concept: RealEstateConcept;
  projectName: string;
  projectId?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const recordExport = useCallback(async (format: string) => {
    try {
      await fetch("/api/design/realestate/export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, format }),
      });
    } catch { /* recording is best-effort */ }
  }, [projectId]);

  const printPdf = useCallback(() => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${projectName}</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:32px auto;line-height:1.5}h1{font-size:24px}h2{font-size:16px;margin-top:20px}</style></head><body>` +
      conceptToHtml(concept, projectName) +
      `<script>setTimeout(()=>window.print(),200)</script></body></html>`
    );
    w.document.close();
    void recordExport("pdf");
  }, [concept, projectName, recordExport]);

  const downloadPackage = useCallback(() => {
    const blob = new Blob([JSON.stringify({ projectName, concept }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}-prompt-package.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    void recordExport("prompt_package");
  }, [concept, projectName, recordExport]);

  const copyPrompts = useCallback(async () => {
    const text = [
      `INTERIOR: ${concept.interiorPrompt}`,
      `EXTERIOR: ${concept.exteriorPrompt}`,
      `LANDSCAPE: ${concept.landscapePrompt}`,
    ].join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [concept]);

  return (
    <div className="space-y-4">
      {/* Export + hand-off actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={printPdf}><Printer className="h-4 w-4" /> Export PDF</Button>
        <Button size="sm" variant="secondary" onClick={downloadPackage}><FileDown className="h-4 w-4" /> Prompt package</Button>
        <Button size="sm" variant="secondary" onClick={copyPrompts}>
          {copied ? <Check className="h-4 w-4 text-brand-600" /> : <Copy className="h-4 w-4" />} Copy image prompts
        </Button>
        <Button asChild size="sm" variant="ghost"><Link href="/dashboard/projects/new"><Video className="h-4 w-4" /> Video Studio</Link></Button>
        <Button asChild size="sm" variant="ghost"><Link href="/dashboard/ads/create"><Megaphone className="h-4 w-4" /> Ad Studio</Link></Button>
        <Button asChild size="sm" variant="ghost"><Link href="/dashboard/calendar"><CalendarDays className="h-4 w-4" /> Schedule</Link></Button>
      </div>

      <Section title="Project Summary">{concept.projectSummary}</Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Design Concept">{concept.designConcept}</Section>
        <Section title="Style Direction">{concept.styleDirection}</Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Suggested Materials">
          <ul className="list-inside list-disc space-y-0.5">{concept.suggestedMaterials.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </Section>
        <Section title="Color Palette">
          <div className="flex flex-wrap gap-2">
            {concept.colorPalette.map((hex, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs">
                <span className="h-4 w-4 rounded-full border border-border" style={{ background: hex }} /> {hex}
              </span>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Space Planning Notes (conceptual)">
        <ul className="list-inside list-disc space-y-0.5">{concept.spacePlanningNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </Section>

      <Section title="Image Prompts (paste into any image model)">
        <div className="space-y-2 font-mono text-xs">
          <p><span className="font-semibold text-foreground">Interior:</span> {concept.interiorPrompt}</p>
          <p><span className="font-semibold text-foreground">Exterior:</span> {concept.exteriorPrompt}</p>
          <p><span className="font-semibold text-foreground">Landscape:</span> {concept.landscapePrompt}</p>
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Marketing Copy">{concept.marketingCopy}</Section>
        <Section title="Listing Description">{concept.listingDescription}</Section>
      </div>

      <Section title="Social Captions">
        <ul className="space-y-1">
          {concept.socialCaptions.map((s, i) => (
            <li key={i}><span className="font-medium text-foreground">{s.platform}:</span> {s.text}</li>
          ))}
        </ul>
      </Section>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Clapperboard className="h-4 w-4 text-brand-600" /> Video Storyboard</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {concept.videoStoryboard.map((s, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{s.shot}</span><span className="text-xs text-muted-foreground">{s.durationSeconds}s</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </div>

      <Section title="Walkthrough Script">{concept.walkthroughScript}</Section>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        {concept.disclaimer}
      </div>
    </div>
  );
}
