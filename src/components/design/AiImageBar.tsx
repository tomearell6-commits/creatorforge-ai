"use client";

import { useCallback, useState } from "react";
import { Sparkles, Coins } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { DESIGN_CREDIT_COSTS } from "@/lib/design/credits";

/**
 * Inline AI-image bar for the editor: type a prompt → fal.ai FLUX renders it →
 * the image lands on the canvas as a new layer (and in Design Assets).
 */
export function AiImageBar({
  projectId, width, height, onImage,
}: {
  projectId?: string;
  width: number;
  height: number;
  onImage: (url: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/design/image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), width, height, projectId, kind: "image" }),
      });
      if (res.status === 402) throw new Error("Not enough credits.");
      if (res.status === 429) throw new Error("Too many requests — wait a minute.");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Image generation failed");
      onImage(json.url);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setBusy(false);
    }
  }, [prompt, width, height, projectId, onImage]);

  return (
    <form onSubmit={generate} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
      <Sparkles className="ml-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe an image to generate onto the canvas…"
        aria-label="AI image prompt"
        className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500"
      />
      <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
        <Coins className="h-3 w-3" /> ~{DESIGN_CREDIT_COSTS.aiImage}
      </span>
      <Button type="submit" size="sm" disabled={busy || !prompt.trim()}>
        {busy ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />}
        {busy ? "Rendering…" : "Generate"}
      </Button>
      {error && <span className="w-full text-xs text-red-600 sm:w-auto">{error}</span>}
    </form>
  );
}
