"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Download } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { THUMBNAIL_STYLES } from "@/lib/media/voices";
import type { Thumbnail } from "@/lib/types";

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

export function ThumbnailGenerator({
  projectId,
  thumbnails,
}: {
  projectId: string;
  thumbnails: Thumbnail[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState(THUMBNAIL_STYLES[0].value);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/thumbnails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, style, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="t-title">Thumbnail title</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. YOU WON'T BELIEVE THIS" />
          </div>
          <div>
            <Label htmlFor="t-style">Style</Label>
            <select id="t-style" value={style} onChange={(e) => setStyle(e.target.value)} className={selectClass}>
              {THUMBNAIL_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="t-prompt">Image prompt (optional)</Label>
          <Textarea id="t-prompt" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the background image…" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button onClick={generate} disabled={loading}>
          <ImagePlus className="h-4 w-4" /> {loading ? "Generating…" : "Generate thumbnail (16:9)"}
        </Button>
      </Card>

      <div className="space-y-3">
        <CardTitle>Thumbnails</CardTitle>
        {thumbnails.length === 0 ? (
          <Card className="text-sm text-muted-foreground">No thumbnails yet.</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {thumbnails.map((t) => (
              <Card key={t.id} className="space-y-2 p-3">
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  {t.image_url && (
                    <Image src={t.image_url} alt={t.title ?? "Thumbnail"} fill unoptimized className="object-cover" />
                  )}
                  {t.title && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/55 p-2">
                      <span className="line-clamp-2 text-sm font-extrabold uppercase tracking-tight text-white drop-shadow">
                        {t.title}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs capitalize text-muted-foreground">{t.style}</span>
                  {t.image_url && (
                    <a
                      href={t.image_url}
                      download={`thumbnail-${t.id}.jpg`}
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                    >
                      <Download className="h-4 w-4" /> Download
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
