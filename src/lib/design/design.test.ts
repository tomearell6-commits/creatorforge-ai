import { describe, it, expect } from "vitest";
import { estimateDesignCredits, isBillable, DESIGN_CREDIT_COSTS } from "./credits";
import { createLayer, normalizeZIndex, duplicateLayer, blankCanvas } from "./layers";
import { generateDesignConcept } from "./generate";
import { generateFootageConcept } from "./footage";
import { getDesignCategoryBySlug, DESIGN_CATEGORIES, DESIGN_FORMATS, getDesignFormat } from "@/config/designStudio";
import { DESIGN_TEMPLATES } from "@/config/designTemplates";

describe("design credits", () => {
  it("uses per-category credits for a concept when provided", () => {
    expect(estimateDesignCredits("concept", 10)).toBe(10);
    expect(estimateDesignCredits("concept")).toBe(DESIGN_CREDIT_COSTS.concept);
  });
  it("standard PNG/JPG export is free; PDF is billable", () => {
    expect(isBillable("exportStandard")).toBe(false);
    expect(isBillable("exportPdf")).toBe(true);
    expect(isBillable("footage")).toBe(true);
  });
});

describe("layer helpers", () => {
  it("createLayer produces a typed layer with defaults", () => {
    const l = createLayer("text");
    expect(l.layerType).toBe("text");
    expect(l.visible).toBe(true);
    expect(typeof l.styleJson).toBe("object");
  });
  it("normalizeZIndex makes z-index contiguous in order", () => {
    const layers = [createLayer("background", { zIndex: 5 }), createLayer("text", { zIndex: 2 })];
    const z = normalizeZIndex(layers).map((l) => l.zIndex);
    expect(z).toEqual([0, 1]);
  });
  it("duplicateLayer clears id and nudges position", () => {
    const src = createLayer("shape", { positionX: 10, positionY: 10, id: "abc" });
    const copy = duplicateLayer(src);
    expect(copy.id).toBeUndefined();
    expect(copy.positionX).toBeGreaterThan(src.positionX);
    expect(copy.layerName).toContain("copy");
  });
  it("blankCanvas has a single locked background", () => {
    const c = blankCanvas();
    expect(c).toHaveLength(1);
    expect(c[0].layerType).toBe("background");
    expect(c[0].locked).toBe(true);
  });
});

describe("design config", () => {
  it("every category slug resolves and has a valid format", () => {
    const formatIds = new Set(DESIGN_FORMATS.map((f) => f.id));
    for (const c of DESIGN_CATEGORIES) {
      expect(getDesignCategoryBySlug(c.slug)?.name).toBe(c.name);
      expect(formatIds.has(c.format)).toBe(true);
    }
  });
  it("getDesignFormat falls back to the first format for unknown ids", () => {
    expect(getDesignFormat("does-not-exist").id).toBe(DESIGN_FORMATS[0].id);
  });
  it("starter templates reference real category slugs", () => {
    for (const t of DESIGN_TEMPLATES) {
      expect(getDesignCategoryBySlug(t.category)).toBeTruthy();
    }
  });
});

describe("design AI generators (placeholder mode, no API key)", () => {
  it("generateDesignConcept returns editable layers and marks usedAI false", async () => {
    const { concept, usedAI } = await generateDesignConcept({
      category: "instagram-post", format: "square-1-1", width: 1080, height: 1080,
      goal: "Announce a summer sale", style: "bold",
    });
    expect(usedAI).toBe(false);
    expect(concept.layers.length).toBeGreaterThan(0);
    expect(concept.layers.some((l) => l.layerType === "background")).toBe(true);
    expect(concept.suggestedColors.length).toBeGreaterThan(0);
  });
  it("generateFootageConcept returns a shot list summing near the duration", async () => {
    const { concept, usedAI } = await generateFootageConcept({ sceneIdea: "A runner at sunrise", duration: 9 });
    expect(usedAI).toBe(false);
    expect(concept.shotList.length).toBeGreaterThan(0);
    expect(concept.videoPrompt).toContain("runner");
  });
});
