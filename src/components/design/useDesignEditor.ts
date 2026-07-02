"use client";

import { useCallback, useState } from "react";
import { createLayer, duplicateLayer, normalizeZIndex } from "@/lib/design/layers";
import type { DesignConcept, DesignLayerData, LayerType } from "@/lib/design/types";

export type EditorLayer = DesignLayerData & { id: string };

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `l_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function withIds(layers: DesignLayerData[]): EditorLayer[] {
  return normalizeZIndex(layers).map((l) => ({ ...l, id: l.id ?? uid() }));
}

export type DesignEditorApi = ReturnType<typeof useDesignEditor>;

export function useDesignEditor(initial: DesignLayerData[] = []) {
  const [layers, setLayersState] = useState<EditorLayer[]>(withIds(initial));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [past, setPast] = useState<EditorLayer[][]>([]);
  const [future, setFuture] = useState<EditorLayer[][]>([]);

  const commit = useCallback((next: EditorLayer[]) => {
    setPast((p) => [...p.slice(-49), layers]);
    setFuture([]);
    setLayersState(next);
  }, [layers]);

  const load = useCallback((next: DesignLayerData[]) => {
    setPast([]); setFuture([]); setSelectedId(null);
    setLayersState(withIds(next));
  }, []);

  const addLayer = useCallback((type: LayerType, overrides: Partial<DesignLayerData> = {}) => {
    const base = createLayer(type, { ...overrides, zIndex: layers.length });
    const layer: EditorLayer = { ...base, id: uid() };
    commit([...layers, layer]);
    setSelectedId(layer.id);
  }, [layers, commit]);

  const updateLayer = useCallback((id: string, patch: Partial<DesignLayerData>) => {
    commit(layers.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, [layers, commit]);

  const updateStyle = useCallback((id: string, patch: Record<string, unknown>) => {
    commit(layers.map((l) => (l.id === id ? { ...l, styleJson: { ...l.styleJson, ...patch } } : l)));
  }, [layers, commit]);

  const updateContent = useCallback((id: string, patch: Record<string, unknown>) => {
    commit(layers.map((l) => (l.id === id ? { ...l, contentJson: { ...l.contentJson, ...patch } } : l)));
  }, [layers, commit]);

  const deleteLayer = useCallback((id: string) => {
    commit(normalizeZIndex(layers.filter((l) => l.id !== id)) as EditorLayer[]);
    setSelectedId((s) => (s === id ? null : s));
  }, [layers, commit]);

  const duplicate = useCallback((id: string) => {
    const src = layers.find((l) => l.id === id);
    if (!src) return;
    const copy: EditorLayer = { ...duplicateLayer(src), id: uid() } as EditorLayer;
    commit([...layers, copy]);
    setSelectedId(copy.id);
  }, [layers, commit]);

  const reorder = useCallback((id: string, dir: "up" | "down") => {
    const sorted = layers.slice().sort((a, b) => a.zIndex - b.zIndex);
    const i = sorted.findIndex((l) => l.id === id);
    const j = dir === "up" ? i + 1 : i - 1;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    commit(sorted.map((l, k) => ({ ...l, zIndex: k })));
  }, [layers, commit]);

  const toggleLock = useCallback((id: string) => {
    updateLayer(id, { locked: !layers.find((l) => l.id === id)?.locked });
  }, [layers, updateLayer]);

  const toggleVisible = useCallback((id: string) => {
    updateLayer(id, { visible: !layers.find((l) => l.id === id)?.visible });
  }, [layers, updateLayer]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [layers, ...f]);
      setLayersState(prev);
      return p.slice(0, -1);
    });
  }, [layers]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, layers]);
      setLayersState(next);
      return f.slice(1);
    });
  }, [layers]);

  const applyConcept = useCallback((concept: DesignConcept) => {
    load(concept.layers);
  }, [load]);

  /** Recolor the background + accent + primary text using a brand palette. */
  const applyBrandColors = useCallback((colors: string[]) => {
    if (colors.length === 0) return;
    const [bg, fg, accent] = [colors[0], colors[1] ?? "#ffffff", colors[2] ?? colors[0]];
    commit(layers.map((l) => {
      if (l.layerType === "background") return { ...l, styleJson: { ...l.styleJson, fill: bg } };
      if (l.layerType === "shape") return { ...l, styleJson: { ...l.styleJson, fill: accent } };
      if (l.layerType === "text") return { ...l, styleJson: { ...l.styleJson, color: fg } };
      return l;
    }));
  }, [layers, commit]);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  return {
    layers, selected, selectedId, setSelectedId,
    canUndo: past.length > 0, canRedo: future.length > 0,
    load, addLayer, updateLayer, updateStyle, updateContent, deleteLayer,
    duplicate, reorder, toggleLock, toggleVisible, undo, redo, applyConcept, applyBrandColors,
  };
}
