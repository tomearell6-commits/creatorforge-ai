"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Mic, Download } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Textarea } from "@/components/ui/Input";
import { VOICES, LANGUAGES, ACCENTS } from "@/lib/media/voices";
import { formatDate } from "@/lib/utils";
import type { Voiceover } from "@/lib/types";

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

export function VoiceStudio({
  projectId,
  defaultText,
  voiceovers,
}: {
  projectId: string;
  defaultText: string;
  voiceovers: Voiceover[];
}) {
  const router = useRouter();
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [language, setLanguage] = useState(LANGUAGES[0].value);
  const [accent, setAccent] = useState(ACCENTS[0].value);
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [text, setText] = useState(defaultText);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "generate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payload = () => ({ voiceId, language, accent, speed, pitch });

  async function preview() {
    setError(null);
    setBusy("preview");
    try {
      const res = await fetch("/api/voice/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload(), text: text.slice(0, 300) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed.");
      setPreviewUrl(data.audioUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setError(null);
    if (!text.trim()) {
      setError("Enter some narration text.");
      return;
    }
    setBusy("generate");
    try {
      const res = await fetch("/api/voice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload(), projectId, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="voice">Voice</Label>
            <select id="voice" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className={selectClass}>
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.gender})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="language">Language</Label>
            <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="accent">Accent</Label>
            <select id="accent" value={accent} onChange={(e) => setAccent(e.target.value)} className={selectClass}>
              {ACCENTS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="speed">Speed — {speed.toFixed(2)}x</Label>
            <input id="speed" type="range" min={0.5} max={2} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-brand-600" />
          </div>
          <div>
            <Label htmlFor="pitch">Pitch — {pitch.toFixed(2)}x</Label>
            <input id="pitch" type="range" min={0.5} max={2} step={0.05} value={pitch} onChange={(e) => setPitch(Number(e.target.value))} className="w-full accent-brand-600" />
          </div>
        </div>

        <div>
          <Label htmlFor="text">Narration</Label>
          <Textarea id="text" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste or edit the narration to voice…" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={preview} disabled={busy !== null}>
            <Play className="h-4 w-4" /> {busy === "preview" ? "Synthesizing…" : "Preview voice"}
          </Button>
          <Button onClick={generate} disabled={busy !== null}>
            <Mic className="h-4 w-4" /> {busy === "generate" ? "Generating…" : "Generate voiceover"}
          </Button>
        </div>

        {previewUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls src={previewUrl} className="w-full" />
        )}
      </Card>

      <div className="space-y-3">
        <CardTitle>Saved voiceovers</CardTitle>
        {voiceovers.length === 0 ? (
          <Card className="text-sm text-muted-foreground">No voiceovers yet.</Card>
        ) : (
          voiceovers.map((v) => (
            <Card key={v.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {VOICES.find((x) => x.id === v.voice_id)?.name ?? v.voice_id} · {v.language} ·{" "}
                  {Math.round(v.duration)}s
                </p>
                <span className="text-xs text-muted-foreground">{formatDate(v.created_at)}</span>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{v.text}</p>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                {v.audio_url && <audio controls src={v.audio_url} className="h-9 flex-1" />}
                {v.audio_url && (
                  <a
                    href={v.audio_url}
                    download={`voiceover-${v.id}.wav`}
                    className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
