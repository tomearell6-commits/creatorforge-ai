"use client";

import { useState } from "react";
import { Type, Square, ImageIcon, Star, Undo2, Redo2, Save, Download, Layers as LayersIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DesignEditorApi } from "./useDesignEditor";
import type { ExportFormat } from "@/lib/design/types";

const EXPORTS: { id: ExportFormat; label: string; note?: string }[] = [
  { id: "png", label: "PNG" },
  { id: "jpg", label: "JPG" },
  { id: "pdf", label: "PDF", note: "1 credit" },
  { id: "mp4", label: "MP4", note: "soon" },
];

/** Editor top toolbar: add elements, undo/redo, save version, export menu. */
export function DesignToolbar({
  ed, onSave, onExport, saving,
}: {
  ed: DesignEditorApi;
  onSave: () => void;
  onExport: (format: ExportFormat) => void;
  saving?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => ed.addLayer("text")} title="Add text"><Type className="h-4 w-4" /> Text</Button>
        <Button size="sm" variant="ghost" onClick={() => ed.addLayer("shape")} title="Add shape"><Square className="h-4 w-4" /> Shape</Button>
        <Button size="sm" variant="ghost" onClick={() => ed.addLayer("image", { contentJson: { url: "" } })} title="Add image"><ImageIcon className="h-4 w-4" /> Image</Button>
        <Button size="sm" variant="ghost" onClick={() => ed.addLayer("icon")} title="Add icon"><Star className="h-4 w-4" /> Icon</Button>
      </div>
      <div className="mx-1 h-6 w-px bg-border" />
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={ed.undo} disabled={!ed.canUndo} title="Undo"><Undo2 className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" onClick={ed.redo} disabled={!ed.canRedo} title="Redo"><Redo2 className="h-4 w-4" /></Button>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><LayersIcon className="h-3.5 w-3.5" /> {ed.layers.length} layers</span>
        <Button size="sm" variant="secondary" onClick={onSave} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save version"}</Button>
        <div className="relative">
          <Button size="sm" onClick={() => setMenu((m) => !m)}><Download className="h-4 w-4" /> Export</Button>
          {menu && (
            <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-border bg-card p-1 shadow-lg">
              {EXPORTS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => { setMenu(false); onExport(x.id); }}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span>{x.label}</span>
                  {x.note && <span className="text-xs text-muted-foreground">{x.note}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
