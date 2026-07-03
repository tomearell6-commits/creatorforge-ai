"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clapperboard, Coins, Sparkles, Video, Megaphone, CalendarDays, Camera, Mic, Type, AlertTriangle, Plane } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { RE_PROPERTY_TYPES, getReOutputType } from "@/config/industrySuites";
import type { WalkthroughConcept } from "@/lib/design/realestate";

const CAMERA = ["Smooth gimbal glide", "Cinematic drone-heavy", "Handheld POV tour", "Static + slow pans", "One-take flow"];
const LIGHTING = ["Golden hour", "Bright daylight", "Dusk / twilight", "Warm interior evening", "Overcast soft"];
const MUSIC = ["Uplifting ambient", "Luxury lounge", "Cinematic orchestral", "Modern electronic", "Acoustic warm"];
const VOICE = ["Warm professional", "Luxury narrator", "Friendly agent", "No voiceover"];
const PLATFORMS = ["YouTube", "Instagram Reels", "TikTok", "Facebook", "Website"];
const RATIOS = ["16:9", "9:16", "1:1", "4:5"];

/** AI Property Walkthrough Designer — property details → scene list, camera
 *  paths, script and prompts, feeding the Video/Ad Studios and the calendar. */
export function WalkthroughDesigner() {
  const [form, setForm] = useState({
    propertyType: RE_PROPERTY_TYPES[0], features: "", cameraStyle: CAMERA[0], lightingStyle: LIGHTING[0],
    musicStyle: MUSIC[0], voiceoverStyle: VOICE[0], duration: 45, aspectRatio: RATIOS[0], platform: PLATFORMS[0],
  });
  const [concept, setConcept] = useState<WalkthroughConcept | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<{ id: string; title: string; concept_json: WalkthroughConcept }[]>([]);

  const cost = getReOutputType("walkthrough").credits;

  const loadRecent = useCallback(async () => {
    const res = await fetch("/api/design/realestate/walkthrough", { cache: "no-store" });
    if (res.ok) { const j = await res.json(); setRecent((j.walkthroughs ?? []).slice(0, 5)); }
  }, []);
  useEffect(() => { void loadRecent(); }, [loadRecent]);

  const generate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/design/realestate/walkthrough", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.status === 402) throw new Error("Not enough credits. Top up in Credit Wallet.");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setConcept(json.concept);
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
      <select value={String(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={generate} className="space-y-3 self-start rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clapperboard className="h-4 w-4 text-brand-600" /> AI Property Walkthrough Designer
        </div>
        {sel("Property type", "propertyType", RE_PROPERTY_TYPES)}
        <label className="block">
          <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Property features</span>
          <textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={2}
            placeholder="Infinity pool, ocean views, chef's kitchen…"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {sel("Camera style", "cameraStyle", CAMERA)}
          {sel("Lighting", "lightingStyle", LIGHTING)}
          {sel("Music", "musicStyle", MUSIC)}
          {sel("Voiceover", "voiceoverStyle", VOICE)}
          {sel("Platform", "platform", PLATFORMS)}
          {sel("Aspect ratio", "aspectRatio", RATIOS)}
        </div>
        <label className="block">
          <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Duration (seconds)</span>
          <input type="number" min={10} max={180} value={form.duration}
            onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
        </label>
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />} Generate walkthrough concept
        </Button>
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Coins className="h-3 w-3" /> ~{cost} credits (only if AI runs)</p>
      </form>

      <div className="space-y-4">
        {concept ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary"><Link href="/dashboard/projects/new"><Video className="h-4 w-4" /> Video Studio</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link href="/dashboard/ads/create"><Megaphone className="h-4 w-4" /> Ad Studio</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link href="/dashboard/calendar"><CalendarDays className="h-4 w-4" /> Publishing Calendar</Link></Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">{concept.title}</h3>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex gap-2"><Camera className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span><span className="font-medium">Camera:</span> {concept.cameraMovement}</span></p>
                <p className="flex gap-2"><Plane className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span><span className="font-medium">Interior path:</span> {concept.interiorCameraPath}</span></p>
                <p className="flex gap-2"><Plane className="mt-0.5 h-4 w-4 shrink-0 rotate-90 text-muted-foreground" /><span><span className="font-medium">Exterior path:</span> {concept.exteriorCameraPath}</span></p>
                <p className="flex gap-2"><Mic className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span><span className="font-medium">Voiceover:</span> {concept.voiceoverScript}</span></p>
                <p className="flex gap-2"><Type className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span><span className="font-medium">Caption:</span> {concept.captionText}</span></p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Scene list</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {concept.sceneList.map((s, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white">
                      <span className="text-2xl font-bold opacity-40">{i + 1}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">{s.scene}</span>
                      <span className="text-xs text-muted-foreground">{s.durationSeconds}s</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Drone shot concepts</h3>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                {concept.droneShotConcepts.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Prompts</h3>
              <div className="mt-2 space-y-2 font-mono text-xs text-muted-foreground">
                <p><span className="font-semibold text-foreground">Video:</span> {concept.videoPrompt}</p>
                <p><span className="font-semibold text-foreground">Thumbnail:</span> {concept.thumbnailPrompt}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Social description:</span> {concept.socialMediaDescription}</p>
            </div>

            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {concept.disclaimer}
            </p>
          </>
        ) : (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Clapperboard className="mb-2 h-8 w-8 opacity-40" />
            Describe the property and shooting style — get a full walkthrough plan: scene list, camera paths, drone shots, voiceover script and video prompt.
          </div>
        )}

        {recent.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent walkthroughs</div>
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
