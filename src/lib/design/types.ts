/**
 * Design Studio shared types — the layer model, AI concept shapes, and the
 * live-footage concept shape. These are the contract between the editor UI,
 * the API routes, and the AI generators.
 */

export type LayerType =
  | "text" | "image" | "shape" | "icon" | "background"
  | "video" | "audio" | "animation" | "overlay";

/** A single editable element on the canvas. Positions/sizes are percentages
 *  of the canvas (0–100) so a design scales cleanly across export formats. */
export type DesignLayerData = {
  id?: string;
  layerType: LayerType;
  layerName: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;      // 0..1
  zIndex: number;
  styleJson: Record<string, unknown>;   // color, fontFamily, fontSize, fill, gradient, effects...
  contentJson: Record<string, unknown>; // text, url, shape kind, iconName...
  locked: boolean;
  visible: boolean;
};

/** Structured AI design concept returned by the concept generator. */
export type DesignConcept = {
  title: string;
  description: string;
  designPrompt: string;
  suggestedColors: string[];          // hex
  suggestedTypography: { heading: string; body: string };
  layoutStructure: string[];          // ordered layout notes top→bottom
  imagePrompt: string;                // background/hero image prompt
  textCopy: { headline: string; subhead: string; body?: string };
  cta: string;
  exportFormat: string;               // recommended export (png/jpg/pdf/mp4)
  layers: DesignLayerData[];          // ready-to-edit starting layers
};

export type DesignConceptInput = {
  category: string;      // category name or slug
  format: string;        // format id
  width: number;
  height: number;
  goal: string;
  style: string;         // style id
  brand?: {
    name?: string;
    colors?: string[];
    fonts?: string[];
    tone?: string;
    description?: string;
  };
};

/** Live AI Footage Designer input + output. */
export type FootageInput = {
  sceneIdea: string;
  subject?: string;
  cameraStyle?: string;
  lighting?: string;
  background?: string;
  motionStyle?: string;
  platform?: string;
  duration?: number;      // seconds
  aspectRatio?: string;
};

export type FootageConcept = {
  title: string;
  videoPrompt: string;                // ready for a text-to-video model
  sceneScript: string;
  shotList: { shot: string; description: string; durationSeconds: number }[];
  cameraDirection: string;
  visualStyle: string;
  lighting: string;
  thumbnailFramePrompt: string;
  suggestedVoiceover: string;
  captionText: string;
};

export const LAYER_TYPES: LayerType[] = [
  "text", "image", "shape", "icon", "background", "video", "audio", "animation", "overlay",
];

export const EXPORT_FORMATS = ["png", "jpg", "pdf", "svg", "mp4", "gif", "zip"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
