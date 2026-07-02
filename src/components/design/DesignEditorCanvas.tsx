"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DesignEditorApi, EditorLayer } from "./useDesignEditor";

function LayerView({ layer, canvasW, canvasH }: { layer: EditorLayer; canvasW: number; canvasH: number }) {
  const s = layer.styleJson as Record<string, unknown>;
  const c = layer.contentJson as Record<string, unknown>;
  const common: React.CSSProperties = {
    position: "absolute",
    left: `${layer.positionX}%`,
    top: `${layer.positionY}%`,
    width: `${layer.width}%`,
    height: `${layer.height}%`,
    opacity: layer.opacity,
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
    pointerEvents: "none",
  };
  if (layer.layerType === "background") {
    return <div style={{ ...common, left: 0, top: 0, width: "100%", height: "100%", background: String(s.fill ?? "#fff") }} />;
  }
  if (layer.layerType === "shape" || layer.layerType === "overlay") {
    return <div style={{ ...common, background: String(s.fill ?? "#84cc16"), borderRadius: Number(s.radius ?? 0) }} />;
  }
  if (layer.layerType === "image") {
    const url = String(c.url ?? "");
    return url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img alt={layer.layerName} src={url} style={{ ...common, objectFit: "cover", borderRadius: Number(s.radius ?? 0) }} />
      : <div style={{ ...common, background: "#e2e8f0" }} />;
  }
  if (layer.layerType === "text") {
    const fontPx = (Number(s.fontSize ?? 40) / 1080) * canvasW * 1.4;
    return (
      <div
        style={{
          ...common,
          color: String(s.color ?? "#0f172a"),
          fontFamily: `${String(s.fontFamily ?? "Inter")}, system-ui, sans-serif`,
          fontSize: `${fontPx}px`,
          fontWeight: Number(s.fontWeight ?? 400),
          textAlign: (String(s.align ?? "left") as React.CSSProperties["textAlign"]),
          lineHeight: 1.15,
          whiteSpace: "pre-wrap",
        }}
      >
        {String(c.text ?? "")}
      </div>
    );
  }
  // video/audio/animation/icon → simple labeled placeholder box
  return (
    <div style={{ ...common, border: "1px dashed #94a3b8", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#64748b" }}>
      {layer.layerType} · {layer.layerName}
    </div>
  );
}

/**
 * Interactive canvas. Renders the layer stack at the project aspect ratio,
 * supports click-to-select and pointer drag to reposition (unlocked layers).
 * The `id` on the wrapper lets the editor rasterize a matching export.
 */
export function DesignEditorCanvas({ ed, width, height }: { ed: DesignEditorApi; width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(600);
  const [drag, setDrag] = useState<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const measure = () => setCanvasW(ref.current?.clientWidth ?? 600);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const canvasH = (canvasW * height) / width;

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.sx) / rect.width) * 100;
    const dy = ((e.clientY - drag.sy) / rect.height) * 100;
    ed.updateLayer(drag.id, {
      positionX: Math.max(-20, Math.min(100, drag.ox + dx)),
      positionY: Math.max(-20, Math.min(100, drag.oy + dy)),
    });
  }, [drag, ed]);

  const sorted = ed.layers.slice().sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="flex items-center justify-center overflow-auto rounded-xl border border-border bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#fff_0%_50%)] bg-[length:24px_24px] p-4">
      <div
        ref={ref}
        className="relative w-full max-w-[720px] shadow-lg"
        style={{ aspectRatio: `${width} / ${height}` }}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        {sorted.map((layer) => {
          const isSel = layer.id === ed.selectedId;
          return (
            <div
              key={layer.id}
              onPointerDown={(e) => {
                ed.setSelectedId(layer.id);
                if (layer.locked || layer.layerType === "background") return;
                e.currentTarget.setPointerCapture(e.pointerId);
                setDrag({ id: layer.id, sx: e.clientX, sy: e.clientY, ox: layer.positionX, oy: layer.positionY });
              }}
              style={{
                position: "absolute",
                left: layer.layerType === "background" ? 0 : `${layer.positionX}%`,
                top: layer.layerType === "background" ? 0 : `${layer.positionY}%`,
                width: layer.layerType === "background" ? "100%" : `${layer.width}%`,
                height: layer.layerType === "background" ? "100%" : `${layer.height}%`,
                cursor: layer.locked ? "default" : "move",
                outline: isSel ? "2px solid #84cc16" : "none",
                outlineOffset: 1,
                zIndex: layer.zIndex + 1,
              }}
            >
              <LayerView layer={layer} canvasW={canvasW} canvasH={canvasH} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
