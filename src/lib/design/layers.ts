/**
 * Layer helpers — factory functions for new layers and z-index utilities.
 * Percentages (0–100) are used for position/size so designs scale across
 * export formats. Kept dependency-free so it can run on client and server.
 */
import type { DesignLayerData, LayerType } from "./types";

const DEFAULTS: Record<LayerType, Partial<DesignLayerData>> = {
  text: {
    width: 60, height: 12,
    styleJson: { color: "#0f172a", fontSize: 40, fontWeight: 700, fontFamily: "Inter", align: "left" },
    contentJson: { text: "New text" },
  },
  image: { width: 40, height: 40, styleJson: { radius: 0 }, contentJson: { url: "" } },
  shape: { width: 30, height: 30, styleJson: { fill: "#84cc16", radius: 8 }, contentJson: { kind: "rect" } },
  icon: { width: 12, height: 12, styleJson: { color: "#0f172a" }, contentJson: { iconName: "Star" } },
  background: { positionX: 0, positionY: 0, width: 100, height: 100, styleJson: { fill: "#ffffff" }, contentJson: {} },
  video: { width: 60, height: 34, styleJson: {}, contentJson: { url: "" } },
  audio: { width: 40, height: 8, styleJson: {}, contentJson: { url: "" } },
  animation: { width: 40, height: 20, styleJson: { effect: "fade" }, contentJson: {} },
  overlay: { positionX: 0, positionY: 0, width: 100, height: 100, opacity: 0.3, styleJson: { fill: "#000000" }, contentJson: {} },
};

let counter = 0;
function nextName(type: LayerType): string {
  counter += 1;
  return `${type[0].toUpperCase()}${type.slice(1)} ${counter}`;
}

export function createLayer(type: LayerType, overrides: Partial<DesignLayerData> = {}): DesignLayerData {
  const d = DEFAULTS[type];
  return {
    layerType: type,
    layerName: overrides.layerName ?? nextName(type),
    positionX: overrides.positionX ?? d.positionX ?? 20,
    positionY: overrides.positionY ?? d.positionY ?? 20,
    width: overrides.width ?? d.width ?? 40,
    height: overrides.height ?? d.height ?? 20,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? d.opacity ?? 1,
    zIndex: overrides.zIndex ?? 0,
    styleJson: { ...(d.styleJson ?? {}), ...(overrides.styleJson ?? {}) },
    contentJson: { ...(d.contentJson ?? {}), ...(overrides.contentJson ?? {}) },
    locked: overrides.locked ?? false,
    visible: overrides.visible ?? true,
  };
}

/** Reindex a layer array so z-index is contiguous and matches array order. */
export function normalizeZIndex(layers: DesignLayerData[]): DesignLayerData[] {
  return layers
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((l, i) => ({ ...l, zIndex: i }));
}

/** Duplicate a layer, nudged so it's visible as a separate element. */
export function duplicateLayer(layer: DesignLayerData): DesignLayerData {
  return {
    ...layer,
    id: undefined,
    layerName: `${layer.layerName} copy`,
    positionX: Math.min(layer.positionX + 3, 95),
    positionY: Math.min(layer.positionY + 3, 95),
    zIndex: layer.zIndex + 1,
  };
}

/** A blank starter canvas: a single white background layer. */
export function blankCanvas(fill = "#ffffff"): DesignLayerData[] {
  return [
    createLayer("background", { layerName: "Background", locked: true, styleJson: { fill }, zIndex: 0 }),
  ];
}
