"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clapperboard, Coins, Sparkles, Video, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { DESIGN_CREDIT_COSTS } from "@/lib/design/credits";
import { VideoGraphicStoryboard } from "./VideoGraphicStoryboard";
import type { FootageConcept } from "@/lib/design/types";

const CAMERA = ["Slow dolly-in", "Handheld", "Drone / aerial", "Static tripod", "Orbit", "Crane up"];
const LIGHTING = ["Soft natural", "Golden hour", "Studio softbox", "Neon / cyberpunk", "Dramatic low-key", "Bright and airy"];
const MOTION = ["Smooth cinematic", "Fast energetic", "Dreamy slow-mo", "Snappy cuts", "Floating parallax"];
const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts", "YouTube", "Facebook", "Ads"];
const RATIOS = ["9:16", "16:9", "1:1", "4:5"];

/** Live AI Footage Designer — turns a scene idea into a structured video concept
 *  that feeds the Video Studio / Ad Studio. */
export function LiveFootagePromptBuilder() {
  const [form, setForm] = useState({
    sceneIdea: "", subject: "", cameraStyle: CAMERA[0], lighting: LIGHTING[0],
    background: "", motionStyle: MOTION[0], platform: PLATFORMS[0], duration: 8, aspectRatio: RATIOS[0],
  });
  const [concept, setConcept] = useState<FootageConcept | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<{ id: string; title: string; concept_json: FootageConcept }[]>([]);

  const loadRecent = useCallback(async () => {
    const res = await fetch("/api/design/footage", { cache: "no-store" });
    if (res.ok) { const j = await res.json(); setRecent((j.concepts ?? []).slice(0, 5)); }
  }, []);
  useEffect(() => { void loadRecent(); }, [loadRecent]);

  const generate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/design/footage", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.status === 402) throw new Error("Not enough credits. Top up in Credit Wallet.");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate concept");
      setConcept(json.concept.concept_json);
      await loadRecent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }, [form, loadRecent]);

  const sel = (label: string, key: keyof typeof form, options: string[]) => (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">{label}</span>
      <select value={form[key] as string} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={generate} className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><Clapperboard className="h-4 w-4 text-brand-600" /> Live AI Footage Designer</div>
        <label className="block">
          <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Scene idea</span>
          <textarea required value={form.sceneIdea} onChange={(e) => setForm({ ...form, sceneIdea: e.target.value })} rows={3}
            placeholder="A runner lacing up premium sneakers at sunrise on an empty track"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Product / subject</span>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Aero X running shoe"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {sel("Camera", "cameraStyle", CAMERA)}
          {sel("Lighting", "lighting", LIGHTING)}
          {sel("Motion", "motionStyle", MOTION)}
          {sel("Platform", "platform", PLATFORMS)}
          {sel("Aspect ratio", "aspectRatio", RATIOS)}
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Duration (s)</span>
            <input type="number" min={3} max={60} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
          </label>
        </div>
        <label className="block">
          <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Background</span>
          <input value={form.background} onChange={(e) => setForm({ ...form, background: e.target.value })} placeholder="Empty athletics track, misty"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
        </label>
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />} Generate footage concept
        </Button>
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Coins className="h-3 w-3" /> ~{DESIGN_CREDIT_COSTS.footage} credits (only if AI runs)</p>
      </form>

      <div className="space-y-4">
        {concept ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary"><Link href="/dashboard/projects/new"><Video className="h-4 w-4" /> Send to Video Studio</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link href="/dashboard/ads/create"><Megaphone className="h-4 w-4" /> Use in Ad Studio</Link></Button>
            </div>
            <VideoGraphicStoryboard concept={concept} />
          </>
        ) : (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Clapperboard className="mb-2 h-8 w-8 opacity-40" />
            Describe a scene and generate a ready-to-shoot footage concept: video prompt, shot list, camera direction, voiceover and caption.
          </div>
        )}

        {recent.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent concepts</div>
            <ul className="space-y-1">
              {recent.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setConcept(r.concept_json)} className="w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-muted">{r.title}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
