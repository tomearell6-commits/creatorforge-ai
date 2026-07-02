"use client";

import { useId } from "react";
import type { DesignEditorApi } from "./useDesignEditor";

function NumField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (n: number) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">{label}</span>
      <input id={id} type="number" value={Math.round(value * 100) / 100} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-brand-500" />
    </label>
  );
}

const FONTS = ["Inter", "Georgia", "Arial", "Times New Roman", "Courier New", "Verdana", "Trebuchet MS"];

/** Properties inspector for the selected layer. */
export function DesignPropertiesPanel({ ed }: { ed: DesignEditorApi }) {
  const l = ed.selected;
  if (!l) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Select a layer to edit its properties.
      </div>
    );
  }
  const s = l.styleJson as Record<string, unknown>;
  const c = l.contentJson as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
  const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{l.layerName}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">{l.layerType}</span>
      </div>

      {l.layerType === "text" && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Text</span>
            <textarea value={str(c.text)} rows={2}
              onChange={(e) => ed.updateContent(l.id, { text: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-brand-500" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Color</span>
              <input type="color" value={str(s.color, "#0f172a")} onChange={(e) => ed.updateStyle(l.id, { color: e.target.value })} className="h-8 w-full rounded-md border border-border" />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Font</span>
              <select value={str(s.fontFamily, "Inter")} onChange={(e) => ed.updateStyle(l.id, { fontFamily: e.target.value })}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-brand-500">
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <NumField label="Font size" value={num(s.fontSize, 40)} min={8} max={400} onChange={(n) => ed.updateStyle(l.id, { fontSize: n })} />
            <NumField label="Weight" value={num(s.fontWeight, 400)} min={100} max={900} step={100} onChange={(n) => ed.updateStyle(l.id, { fontWeight: n })} />
          </div>
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Align</span>
            <select value={str(s.align, "left")} onChange={(e) => ed.updateStyle(l.id, { align: e.target.value })}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-brand-500">
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </label>
        </div>
      )}

      {(l.layerType === "shape" || l.layerType === "overlay" || l.layerType === "background") && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Fill</span>
            <input type="color" value={str(s.fill, "#84cc16")} onChange={(e) => ed.updateStyle(l.id, { fill: e.target.value })} className="h-8 w-full rounded-md border border-border" />
          </label>
          {l.layerType !== "background" && (
            <NumField label="Radius" value={num(s.radius, 0)} min={0} max={200} onChange={(n) => ed.updateStyle(l.id, { radius: n })} />
          )}
        </div>
      )}

      {l.layerType === "image" && (
        <label className="block">
          <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Image URL</span>
          <input type="url" value={str(c.url)} placeholder="https://…" onChange={(e) => ed.updateContent(l.id, { url: e.target.value })}
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-brand-500" />
        </label>
      )}

      <div>
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Transform</span>
        <div className="grid grid-cols-2 gap-2">
          <NumField label="X %" value={l.positionX} onChange={(n) => ed.updateLayer(l.id, { positionX: n })} />
          <NumField label="Y %" value={l.positionY} onChange={(n) => ed.updateLayer(l.id, { positionY: n })} />
          <NumField label="Width %" value={l.width} min={1} max={100} onChange={(n) => ed.updateLayer(l.id, { width: n })} />
          <NumField label="Height %" value={l.height} min={1} max={100} onChange={(n) => ed.updateLayer(l.id, { height: n })} />
          <NumField label="Rotation" value={l.rotation} min={-180} max={180} onChange={(n) => ed.updateLayer(l.id, { rotation: n })} />
          <NumField label="Opacity" value={l.opacity} min={0} max={1} step={0.05} onChange={(n) => ed.updateLayer(l.id, { opacity: n })} />
        </div>
      </div>
    </div>
  );
}
