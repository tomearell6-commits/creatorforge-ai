"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Trash2, Download, FileText, Film } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, formatDate } from "@/lib/utils";
import type { Asset, AssetType } from "@/lib/types";

const FILTERS: { value: "all" | AssetType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "thumbnail", label: "Thumbnails" },
  { value: "subtitle", label: "Subtitles" },
];

export function AssetLibrary({ assets: initial }: { assets: Asset[] }) {
  const router = useRouter();
  const [assets, setAssets] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | AssetType>("all");

  const filtered = useMemo(
    () =>
      assets.filter(
        (a) =>
          (filter === "all" || a.type === filter) &&
          a.name.toLowerCase().includes(query.toLowerCase())
      ),
    [assets, query, filter]
  );

  async function remove(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    await fetch("/api/assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assets…" aria-label="Search assets" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border border-border px-3 py-1 text-sm",
                filter === f.value ? "bg-brand-600 text-white" : "hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="text-sm text-muted-foreground">No assets match.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Card key={a.id} className="space-y-2 p-3">
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
                {(a.type === "image" || a.type === "thumbnail") && a.url ? (
                  <Image src={a.url} alt={a.name} fill unoptimized className="object-cover" />
                ) : a.type === "audio" && a.url ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio controls src={a.url} className="w-[90%]" />
                ) : a.type === "subtitle" ? (
                  <FileText className="h-10 w-10 text-muted-foreground" />
                ) : (
                  <Film className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <p className="truncate text-sm font-medium" title={a.name}>
                {a.name}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="capitalize">{a.type}</span>
                <span>{formatDate(a.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                {a.url ? (
                  <a
                    href={a.url}
                    download={a.name}
                    className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">No file (placeholder)</span>
                )}
                <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
