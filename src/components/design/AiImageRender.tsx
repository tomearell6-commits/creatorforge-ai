"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Sparkles, Download, Coins, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { DESIGN_CREDIT_COSTS } from "@/lib/design/credits";

/**
 * One prompt → rendered image card. Calls POST /api/design/image (fal.ai FLUX),
 * shows the persisted image with a download action. Credits are labeled before
 * generation and only charged server-side when real AI succeeds.
 */
export function AiImageRender({
  label, prompt, width = 1344, height = 768, projectId, kind = "image",
}: {
  label: string;
  prompt: string;
  width?: number;
  height?: number;
  projectId?: string | null;
  kind?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/design/image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, width, height, projectId: projectId ?? undefined, kind, name: label }),
      });
      if (res.status === 402) throw new Error("Not enough credits. Top up in Credit Wallet.");
      if (res.status === 429) throw new Error("Too many image requests — wait a minute and retry.");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Image generation failed");
      setUrl(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image generation failed");
    } finally {
      setBusy(false);
    }
  }, [prompt, width, height, projectId, kind, label]);

  const download = useCallback(async () => {
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${label.replace(/\s+/g, "-").toLowerCase()}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { /* cross-origin fallback: open in new tab */ window.open(url, "_blank"); }
  }, [url, label]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative bg-muted" style={{ aspectRatio: `${width} / ${height}` }}>
        {url ? (
          <Image src={url} alt={label} fill sizes="600px" className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {busy ? <Spinner /> : <Sparkles className="h-6 w-6 opacity-40" />}
            <span className="text-xs">{busy ? "Rendering…" : "Not rendered yet"}</span>
          </div>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="text-sm font-semibold">{label}</div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={generate} disabled={busy}>
            {busy ? <Spinner size="sm" className="text-current" /> : url ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {url ? "Re-render" : "Render image"}
          </Button>
          {url && (
            <Button size="sm" variant="secondary" onClick={download}><Download className="h-4 w-4" /> Download</Button>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Coins className="h-3 w-3" /> ~{DESIGN_CREDIT_COSTS.aiImage} credits
          </span>
        </div>
      </div>
    </div>
  );
}
