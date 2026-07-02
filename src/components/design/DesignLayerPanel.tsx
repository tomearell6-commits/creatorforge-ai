"use client";

import { Eye, EyeOff, Lock, Unlock, Copy, Trash2, ChevronUp, ChevronDown, Type, Square, Image as ImageIcon, Star, Layers } from "lucide-react";
import type { DesignEditorApi } from "./useDesignEditor";
import type { LayerType } from "@/lib/design/types";

const ICON: Partial<Record<LayerType, typeof Type>> = {
  text: Type, shape: Square, image: ImageIcon, icon: Star, background: Layers, overlay: Square,
};

/** Layer list: select, toggle visibility/lock, reorder, duplicate, delete. */
export function DesignLayerPanel({ ed }: { ed: DesignEditorApi }) {
  const sorted = ed.layers.slice().sort((a, b) => b.zIndex - a.zIndex); // top layer first
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-sm font-semibold">Layers</div>
      <ul className="max-h-[360px] divide-y divide-border overflow-y-auto">
        {sorted.map((l) => {
          const Icon = ICON[l.layerType] ?? Layers;
          const active = l.id === ed.selectedId;
          return (
            <li
              key={l.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-sm ${active ? "bg-brand-50 dark:bg-brand-950/30" : ""}`}
            >
              <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => ed.setSelectedId(l.id)}>
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{l.layerName}</span>
              </button>
              <button onClick={() => ed.toggleVisible(l.id)} title="Toggle visibility" className="rounded p-1 hover:bg-muted">
                {l.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              <button onClick={() => ed.toggleLock(l.id)} title="Lock" className="rounded p-1 hover:bg-muted">
                {l.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              <button onClick={() => ed.reorder(l.id, "up")} title="Bring forward" className="rounded p-1 hover:bg-muted"><ChevronUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => ed.reorder(l.id, "down")} title="Send back" className="rounded p-1 hover:bg-muted"><ChevronDown className="h-3.5 w-3.5" /></button>
              <button onClick={() => ed.duplicate(l.id)} title="Duplicate" className="rounded p-1 hover:bg-muted"><Copy className="h-3.5 w-3.5" /></button>
              <button onClick={() => ed.deleteLayer(l.id)} title="Delete" className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          );
        })}
        {sorted.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted-foreground">No layers yet.</li>}
      </ul>
    </div>
  );
}
