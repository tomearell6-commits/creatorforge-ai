"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Wand2,
  ImageIcon,
  Save,
  ChevronUp,
  ChevronDown,
  Captions,
  Download,
  Mic,
  Film,
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import type { Scene, Subtitle } from "@/lib/types";

const TRANSITIONS = ["cut", "fade", "slide", "zoom", "dissolve"];
const selectClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

export function SceneBuilder({
  projectId,
  initialScenes,
  hasScript,
  initialSubtitle,
}: {
  projectId: string;
  initialScenes: Scene[];
  hasScript: boolean;
  initialSubtitle: Subtitle | null;
}) {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 0), 0);

  function patchLocal(id: string, patch: Partial<Scene>) {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function build() {
    if (
      scenes.length > 0 &&
      !(await confirm({
        title: "Rebuild scenes?",
        description: "This replaces the current scenes.",
        confirmLabel: "Rebuild",
      }))
    )
      return;
    setError(null);
    setBuilding(true);
    try {
      const res = await fetch("/api/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not build scenes.");
      setScenes(data.scenes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build scenes.");
    } finally {
      setBuilding(false);
    }
  }

  async function saveScene(scene: Scene) {
    await fetch("/api/scenes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: scene.id,
        title: scene.title,
        text: scene.text,
        visual_description: scene.visual_description,
        image_prompt: scene.image_prompt,
        video_prompt: scene.video_prompt,
        camera_direction: scene.camera_direction,
        transition: scene.transition,
        duration: scene.duration,
      }),
    });
  }

  async function generateImage(scene: Scene) {
    setError(null);
    patchLocal(scene.id, { image_url: "loading" });
    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, sceneId: scene.id, prompt: scene.image_prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        patchLocal(scene.id, { image_url: null });
        setError(data.error || `Image generation failed (${res.status}). Please try again.`);
        return;
      }
      patchLocal(scene.id, { image_url: data.url });
    } catch {
      patchLocal(scene.id, { image_url: null });
      setError("Couldn't reach the image generator. Please try again in a moment.");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= scenes.length) return;
    const reordered = [...scenes];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setScenes(reordered);
    await fetch("/api/scenes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((s) => s.id) }),
    });
  }

  return (
    <div className="space-y-6">
      {dialog}
      <Card className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <CardTitle>Scenes</CardTitle>
          <CardDescription>
            {scenes.length > 0
              ? `${scenes.length} scenes · ~${totalDuration}s total`
              : "Automatically divide the saved script into editable scenes."}
          </CardDescription>
        </div>
        <Button onClick={build} disabled={building || !hasScript}>
          <Wand2 className="h-4 w-4" />
          {building ? "Building…" : scenes.length > 0 ? "Rebuild scenes" : "Build scenes"}
        </Button>
      </Card>

      {!hasScript && (
        <p className="text-sm text-muted-foreground">
          Generate and save a script to this project first, then build scenes.
        </p>
      )}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Timeline */}
      {scenes.length > 0 && (
        <Card className="space-y-3">
          <CardTitle className="text-base">Timeline</CardTitle>
          <div className="space-y-2">
            {scenes.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === scenes.length - 1} className="disabled:opacity-30">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <span className="w-6 text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-medium">{s.title}</span>
                <Badge active={!!s.image_url && s.image_url !== "loading"} icon={<ImageIcon className="h-3 w-3" />} label="Image" />
                <Badge active={!!s.voice_url} icon={<Mic className="h-3 w-3" />} label="Voice" />
                <Badge active={!!s.video_url} icon={<Film className="h-3 w-3" />} label="Video" />
                <span className="w-12 text-right text-xs text-muted-foreground">{s.duration}s</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Scene editors */}
      {scenes.map((scene) => (
        <Card key={scene.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <Input
              value={scene.title ?? ""}
              onChange={(e) => patchLocal(scene.id, { title: e.target.value })}
              className="max-w-xs font-semibold"
            />
            <div className="flex items-center gap-2">
              <Label htmlFor={`dur-${scene.id}`} className="mb-0">
                Duration
              </Label>
              <Input
                id={`dur-${scene.id}`}
                type="number"
                min={1}
                value={scene.duration}
                onChange={(e) => patchLocal(scene.id, { duration: Number(e.target.value) })}
                className="w-20"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <Label htmlFor={`sb-narration-${scene.id}`}>Narration</Label>
                <Textarea id={`sb-narration-${scene.id}`} rows={3} value={scene.text ?? ""} onChange={(e) => patchLocal(scene.id, { text: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={`sb-visual-description-${scene.id}`}>Visual description</Label>
                <Textarea id={`sb-visual-description-${scene.id}`} rows={2} value={scene.visual_description ?? ""} onChange={(e) => patchLocal(scene.id, { visual_description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`sb-camera-direction-${scene.id}`}>Camera direction</Label>
                  <Input id={`sb-camera-direction-${scene.id}`} value={scene.camera_direction ?? ""} onChange={(e) => patchLocal(scene.id, { camera_direction: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`sb-transition-${scene.id}`}>Transition</Label>
                  <select id={`sb-transition-${scene.id}`} value={scene.transition ?? "cut"} onChange={(e) => patchLocal(scene.id, { transition: e.target.value })} className={selectClass}>
                    {TRANSITIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor={`sb-ai-image-prompt-${scene.id}`}>AI image prompt</Label>
                <Textarea id={`sb-ai-image-prompt-${scene.id}`} rows={2} value={scene.image_prompt ?? ""} onChange={(e) => patchLocal(scene.id, { image_prompt: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={`sb-ai-video-prompt-${scene.id}`}>AI video prompt</Label>
                <Textarea id={`sb-ai-video-prompt-${scene.id}`} rows={2} value={scene.video_prompt ?? ""} onChange={(e) => patchLocal(scene.id, { video_prompt: e.target.value })} />
              </div>
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
                {scene.image_url === "loading" ? (
                  <span className="text-sm text-muted-foreground">Generating…</span>
                ) : scene.image_url ? (
                  <Image src={scene.image_url} alt={scene.title ?? "Scene"} fill unoptimized className="object-cover" />
                ) : (
                  <span className="text-sm text-muted-foreground">No image yet</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => saveScene(scene)}>
              <Save className="h-4 w-4" /> Save scene
            </Button>
            <Button variant="outline" size="sm" onClick={() => generateImage(scene)}>
              <ImageIcon className="h-4 w-4" /> Generate image
            </Button>
          </div>
        </Card>
      ))}

      {scenes.length > 0 && <SubtitleSection projectId={projectId} initialSubtitle={initialSubtitle} />}
    </div>
  );
}

function Badge({ active, icon, label }: { active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span
      className={cn(
        "hidden items-center gap-1 rounded-full px-2 py-0.5 text-xs sm:inline-flex",
        active ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" : "bg-muted text-muted-foreground"
      )}
      title={label}
    >
      {icon} {label}
    </span>
  );
}

function SubtitleSection({
  projectId,
  initialSubtitle,
}: {
  projectId: string;
  initialSubtitle: Subtitle | null;
}) {
  const [subtitle, setSubtitle] = useState<Subtitle | null>(initialSubtitle);
  const [format, setFormat] = useState<"srt" | "vtt">(initialSubtitle?.format ?? "srt");
  const [content, setContent] = useState(initialSubtitle?.content ?? "");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const res = await fetch("/api/subtitles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, format }),
    });
    const data = await res.json();
    if (res.ok) {
      setSubtitle(data.subtitle);
      setContent(data.subtitle.content);
    }
    setBusy(false);
  }

  async function save() {
    if (!subtitle) return;
    setBusy(true);
    await fetch("/api/subtitles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: subtitle.id, content }),
    });
    setBusy(false);
  }

  const downloadHref = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Captions className="h-4 w-4" /> Subtitles
        </CardTitle>
        <div className="flex items-center gap-2">
          <select value={format} onChange={(e) => setFormat(e.target.value as "srt" | "vtt")} className={selectClass + " w-24"}>
            <option value="srt">SRT</option>
            <option value="vtt">VTT</option>
          </select>
          <Button size="sm" onClick={generate} disabled={busy}>
            {busy ? "Working…" : "Generate"}
          </Button>
        </div>
      </div>

      {subtitle && (
        <>
          <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-xs" />
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={save} disabled={busy}>
              <Save className="h-4 w-4" /> Save captions
            </Button>
            <a
              href={downloadHref}
              download={`subtitles.${subtitle.format}`}
              className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
            >
              <Download className="h-4 w-4" /> Download .{subtitle.format}
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Burned-in captions render at final video export (Phase 4).
          </p>
        </>
      )}
    </Card>
  );
}
