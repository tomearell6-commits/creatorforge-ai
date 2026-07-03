import { describe, it, expect } from "vitest";
import { generateRealEstateConcept, generateWalkthroughConcept } from "./realestate";
import {
  INDUSTRY_SUITES, REAL_ESTATE_GROUPS, REAL_ESTATE_CATEGORY_INDEX,
  RE_OUTPUT_TYPES, getReOutputType, getSuiteBySlug, slugifySuiteCategory, RE_DISCLAIMER,
} from "@/config/industrySuites";
import { INDUSTRY_TEMPLATES, getIndustryTemplatesForSuite } from "@/config/industryTemplates";

describe("industry suites config", () => {
  it("registers 13 suites with real-estate active first", () => {
    expect(INDUSTRY_SUITES).toHaveLength(13);
    expect(INDUSTRY_SUITES[0].id).toBe("real-estate-architecture");
    expect(INDUSTRY_SUITES[0].status).toBe("active");
    expect(INDUSTRY_SUITES.filter((s) => s.status === "active")).toHaveLength(1);
  });
  it("getSuiteBySlug resolves and unknown slugs return undefined", () => {
    expect(getSuiteBySlug("real-estate-architecture")?.name).toBe("Real Estate & Architecture");
    expect(getSuiteBySlug("nope")).toBeUndefined();
  });
  it("has 10 real estate category groups with unique category slugs", () => {
    expect(REAL_ESTATE_GROUPS).toHaveLength(10);
    const total = REAL_ESTATE_GROUPS.reduce((n, g) => n + g.categories.length, 0);
    expect(Object.keys(REAL_ESTATE_CATEGORY_INDEX).length).toBe(total); // no slug collisions
  });
  it("output types all have positive credits", () => {
    expect(RE_OUTPUT_TYPES.length).toBe(9);
    for (const o of RE_OUTPUT_TYPES) expect(o.credits).toBeGreaterThan(0);
    expect(getReOutputType("unknown").id).toBe("concept_prompt"); // safe fallback
  });
});

describe("industry templates", () => {
  it("ships 24 real estate templates with valid category slugs", () => {
    const re = getIndustryTemplatesForSuite("real-estate-architecture");
    expect(re).toHaveLength(24);
    for (const t of re) {
      expect(REAL_ESTATE_CATEGORY_INDEX[t.category]).toBeTruthy();
      expect(t.estimatedCredits).toBeGreaterThan(0);
      expect(t.exportFormats.length).toBeGreaterThan(0);
    }
    expect(INDUSTRY_TEMPLATES.every((t) => t.slug === slugifySuiteCategory(t.name))).toBe(true);
  });
});

describe("real estate AI generators (placeholder mode)", () => {
  it("concept includes every structured section and the disclaimer", async () => {
    const { concept, usedAI } = await generateRealEstateConcept({
      projectName: "Sunrise Villa", propertyType: "Luxury Villa", designStyle: "Modern",
      bedrooms: 4, bathrooms: 3, city: "Sydney", outputType: "concept_prompt",
    });
    expect(usedAI).toBe(false);
    expect(concept.projectSummary).toContain("Sunrise Villa");
    expect(concept.suggestedMaterials.length).toBeGreaterThan(0);
    expect(concept.colorPalette.length).toBeGreaterThan(0);
    expect(concept.videoStoryboard.length).toBeGreaterThan(0);
    expect(concept.socialCaptions.length).toBeGreaterThan(0);
    expect(concept.interiorPrompt).toBeTruthy();
    expect(concept.disclaimer).toBe(RE_DISCLAIMER);
  });
  it("walkthrough scene durations roughly sum to the requested duration", async () => {
    const { concept, usedAI } = await generateWalkthroughConcept({
      propertyType: "Luxury Villa", features: "infinity pool", duration: 60,
    });
    expect(usedAI).toBe(false);
    const total = concept.sceneList.reduce((n, s) => n + s.durationSeconds, 0);
    expect(Math.abs(total - 60)).toBeLessThanOrEqual(6);
    expect(concept.videoPrompt).toContain("villa");
    expect(concept.droneShotConcepts.length).toBeGreaterThan(0);
    expect(concept.disclaimer).toBe(RE_DISCLAIMER);
  });
});
