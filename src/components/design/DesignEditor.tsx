"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { useDesignEditor } from "./useDesignEditor";
import { DesignEditorCanvas } from "./DesignEditorCanvas";
import { DesignToolbar } from "./DesignToolbar";
import { DesignLayerPanel } from "./DesignLayerPanel";
import { DesignPropertiesPanel } from "./DesignPropertiesPanel";
import { BrandKitSelector } from "./BrandKitSelector";
import { AiImageBar } from "./AiImageBar";
import { blankCanvas } from "@/lib/design/layers";
import { renderToDataUrl, downloadDataUrl, printImageAsPdf } from "@/lib/design/render";
import type { ExportFormat } from "@/lib/design/types";

/**
 * The Design Studio editor. Loads a project (or a blank canvas), composes the
 * toolbar, canvas, layer panel and properties inspector, and handles save /
 * version / export. Manual editing is entirely client-side and free.
 */
export function DesignEditor({ projectId }: { projectId?: string }) {
  const ed = useDesignEditor(blankCanvas());
  const [meta, setMeta] = useState({ title: "Untitled design", width: 1080, height: 1080 });
  const [loading, setLoading] = useState(!!projectId);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ variant: "success" | "error" | "info"; text: string } | null>(null);

  const loadRef = ed.load;
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/design/projects/${projectId}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load project");
        if (!active) return;
        setMeta({ title: json.project.title, width: json.project.width, height: json.project.height });
        const layers = (json.layers ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string, layerType: r.layer_type, layerName: r.layer_name,
          positionX: Number(r.position_x), positionY: Number(r.position_y), width: Number(r.width), height: Number(r.height),
          rotation: Number(r.rotation), opacity: Number(r.opacity), zIndex: Number(r.z_index),
          styleJson: r.style_json ?? {}, contentJson: r.content_json ?? {}, locked: !!r.locked, visible: r.visible !== false,
        }));
        loadRef(layers.length ? layers : blankCanvas());
      } catch (e) {
        if (active) setMsg({ variant: "error", text: e instanceof Error ? e.message : "Failed to load project" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId, loadRef]);

  const save = useCallback(async () => {
    if (!projectId) { setMsg({ variant: "info", text: "Create a project first to save it." }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const strip = ed.layers.map((l) => ({
        layerType: l.layerType, layerName: l.layerName,
        positionX: l.positionX, positionY: l.positionY, width: l.width, height: l.height,
        rotation: l.rotation, opacity: l.opacity, zIndex: l.zIndex,
        styleJson: l.styleJson, contentJson: l.contentJson, locked: l.locked, visible: l.visible,
      }));
      const layersRes = await fetch("/api/design/layers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, layers: strip }),
      });
      if (!layersRes.ok) throw new Error("Failed to save layers");
      await fetch("/api/design/versions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, layers: strip }),
      });
      setMsg({ variant: "success", text: "Design saved as a new version." });
    } catch (e) {
      setMsg({ variant: "error", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }, [projectId, ed.layers]);

  const exportAs = useCallback(async (format: ExportFormat) => {
    setMsg(null);
    if (format === "mp4") {
      setMsg({ variant: "info", text: "Animated MP4 export is coming soon — PNG, JPG and PDF are ready now." });
      return;
    }
    try {
      const dataUrl = await renderToDataUrl(ed.layers, meta.width, meta.height, format === "jpg" ? "jpg" : "png");
      const name = `${meta.title.replace(/\s+/g, "-").toLowerCase()}.${format === "jpg" ? "jpg" : "png"}`;
      if (format === "pdf") {
        printImageAsPdf(dataUrl, meta.title);
      } else {
        downloadDataUrl(dataUrl, name);
      }
      // Record the export (charges a credit for PDF; PNG/JPG are free).
      const res = await fetch("/api/design/export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, format, width: meta.width, height: meta.height }),
      });
      if (res.status === 402) { setMsg({ variant: "error", text: "Not enough credits for PDF export." }); return; }
      setMsg({ variant: "success", text: `Exported ${format.toUpperCase()}.` });
    } catch (e) {
      setMsg({ variant: "error", text: e instanceof Error ? e.message : "Export failed" });
    }
  }, [ed.layers, meta, projectId]);

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><Spinner /> Loading design…</div>;
  }

  return (
    <div className="space-y-3">
      <DesignToolbar ed={ed} onSave={save} onExport={exportAs} saving={saving} />
      <AiImageBar
        projectId={projectId}
        width={meta.width}
        height={meta.height}
        onImage={(url) => ed.addLayer("image", { contentJson: { url }, width: 50, height: 50, positionX: 25, positionY: 25 })}
      />
      {msg && <Alert variant={msg.variant}>{msg.text}</Alert>}
      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <DesignEditorCanvas ed={ed} width={meta.width} height={meta.height} />
        <div className="space-y-3">
          <BrandKitSelector onApplyColors={ed.applyBrandColors} compact />
          <DesignPropertiesPanel ed={ed} />
          <DesignLayerPanel ed={ed} />
        </div>
      </div>
    </div>
  );
}
