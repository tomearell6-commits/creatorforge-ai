/**
 * Design Studio AI concept generator. Produces a structured DesignConcept
 * (layout + copy + palette + ready-to-edit layers) as JSON. Uses Claude when
 * ANTHROPIC_API_KEY is set; otherwise a deterministic placeholder so the flow
 * always works and never charges credits.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { DesignConcept, DesignConceptInput, DesignLayerData } from "./types";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export function willUseRealDesignAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function starterLayers(headline: string, subhead: string, colors: string[]): DesignLayerData[] {
  const [bg = "#0f172a", fg = "#ffffff", accent = "#84cc16"] = colors;
  return [
    { layerType: "background", layerName: "Background", positionX: 0, positionY: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0, styleJson: { fill: bg }, contentJson: {}, locked: true, visible: true },
    { layerType: "shape", layerName: "Accent", positionX: 8, positionY: 76, width: 28, height: 2, rotation: 0, opacity: 1, zIndex: 1, styleJson: { fill: accent, radius: 4 }, contentJson: { kind: "rect" }, locked: false, visible: true },
    { layerType: "text", layerName: "Headline", positionX: 8, positionY: 28, width: 84, height: 30, rotation: 0, opacity: 1, zIndex: 2, styleJson: { color: fg, fontSize: 60, fontWeight: 800, fontFamily: "Inter", align: "left" }, contentJson: { text: headline }, locked: false, visible: true },
    { layerType: "text", layerName: "Subhead", positionX: 8, positionY: 60, width: 72, height: 12, rotation: 0, opacity: 0.9, zIndex: 3, styleJson: { color: fg, fontSize: 26, fontWeight: 400, fontFamily: "Inter", align: "left" }, contentJson: { text: subhead }, locked: false, visible: true },
  ];
}

function placeholder(input: DesignConceptInput): DesignConcept {
  const cat = titleCase(input.category.replace(/-/g, " "));
  const colors = input.brand?.colors?.length ? input.brand.colors : ["#0f172a", "#ffffff", "#84cc16"];
  const headline = input.goal ? titleCase(input.goal).slice(0, 40) : cat;
  const subhead = input.brand?.name ? `by ${input.brand.name}` : "Made with CreatorsForge";
  return {
    title: `${cat} — ${titleCase(input.style)} concept`,
    description: `A ${input.style} ${cat.toLowerCase()} designed for: ${input.goal || "your goal"}.`,
    designPrompt: `${input.style} ${cat.toLowerCase()}, ${input.goal || ""}, ${input.width}x${input.height}, professional composition, balanced hierarchy, ample negative space`.trim(),
    suggestedColors: colors,
    suggestedTypography: { heading: input.brand?.fonts?.[0] || "Inter", body: input.brand?.fonts?.[1] || "Inter" },
    layoutStructure: ["Headline top-left", "Accent bar under headline", "Supporting subhead", "Brand mark bottom"],
    imagePrompt: `${input.style} background for a ${cat.toLowerCase()}, ${input.goal || "clean subject"}, high quality, no text`,
    textCopy: { headline, subhead, body: input.goal },
    cta: "Learn more",
    exportFormat: input.format.includes("story") || input.category.includes("video") ? "mp4" : "png",
    layers: starterLayers(headline, subhead, colors),
  };
}

export async function generateDesignConcept(
  input: DesignConceptInput
): Promise<{ concept: DesignConcept; usedAI: boolean }> {
  if (!willUseRealDesignAI()) return { concept: placeholder(input), usedAI: false };
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system:
        "You are a senior brand & graphic designer. Return ONLY valid minified JSON matching this TypeScript type: " +
        "{title,description,designPrompt,suggestedColors:string[](hex),suggestedTypography:{heading,body}," +
        "layoutStructure:string[],imagePrompt,textCopy:{headline,subhead,body?},cta,exportFormat," +
        "layers:{layerType('text'|'image'|'shape'|'icon'|'background'|'overlay'),layerName,positionX,positionY,width,height," +
        "rotation,opacity,zIndex,styleJson(object),contentJson(object),locked,visible}[]}. " +
        "positionX/positionY/width/height are PERCENTAGES 0-100 of the canvas. Include a background layer (zIndex 0), " +
        "a headline text layer, and 2-5 supporting layers. Make copy specific and on-brief. No commentary.",
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```json?/i, "")
      .replace(/```$/, "");
    const concept = JSON.parse(text) as DesignConcept;
    // Guarantee at least a background + headline so the editor always renders.
    if (!Array.isArray(concept.layers) || concept.layers.length === 0) {
      concept.layers = placeholder(input).layers;
    }
    return { concept, usedAI: true };
  } catch {
    return { concept: placeholder(input), usedAI: false };
  }
}
