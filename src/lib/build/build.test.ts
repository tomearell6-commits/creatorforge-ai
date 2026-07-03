import { describe, it, expect } from "vitest";
import { generateBuildPackage, packageToMarkdown, willUseRealBuildAI, BUILD_DISCLAIMER } from "./generate";
import { BUILD_GROUPS, BUILD_PROJECT_TYPES, BUILD_GOALS, BUILD_STYLES, getBuildTypeBySlug, BUILD_CREDIT_COSTS } from "@/config/buildStudio";
import { BUILD_TEMPLATES } from "@/config/buildTemplates";

describe("build studio config", () => {
  it("has 6 groups and 68 unique project types", () => {
    expect(BUILD_GROUPS).toHaveLength(6);
    expect(BUILD_PROJECT_TYPES.length).toBe(68);
    const slugs = BUILD_PROJECT_TYPES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length); // no slug collisions
    expect(BUILD_GOALS).toHaveLength(8);
    expect(BUILD_STYLES).toHaveLength(9);
  });
  it("templates reference real project types", () => {
    for (const t of BUILD_TEMPLATES) {
      expect(getBuildTypeBySlug(t.projectType), `template ${t.id} -> ${t.projectType}`).toBeTruthy();
      expect(BUILD_GROUPS.some((g) => g.id === t.category)).toBe(true);
    }
    expect(BUILD_TEMPLATES.length).toBeGreaterThanOrEqual(15);
  });
  it("standard exports are free, PDF costs 1", () => {
    expect(BUILD_CREDIT_COSTS.exportStandard).toBe(0);
    expect(BUILD_CREDIT_COSTS.exportPdf).toBe(1);
    expect(BUILD_CREDIT_COSTS.fullPackage).toBe(20);
  });
});

describe("build package generation (placeholder mode)", () => {
  it("produces every required section with the honesty disclaimer", async () => {
    if (willUseRealBuildAI()) return; // placeholder-mode assertions only
    const { pkg, usedAI } = await generateBuildPackage({
      projectType: "SaaS App", group: "webapp",
      idea: "A tool that helps freelancers track invoices and get paid faster",
      targetAudience: "Freelancers", goal: "Subscriptions", style: "Tech",
    });
    expect(usedAI).toBe(false);
    expect(pkg.pages.length).toBeGreaterThan(0);
    expect(pkg.features.length).toBeGreaterThan(0);
    expect(pkg.roadmap.length).toBeGreaterThanOrEqual(3);
    expect(pkg.marketingPlan.launchPhases.length).toBeGreaterThan(0);
    expect(pkg.databaseSuggestion.length).toBeGreaterThan(0);
    expect(pkg.techStack.length).toBeGreaterThan(0);
    expect(pkg.disclaimer).toBe(BUILD_DISCLAIMER);
    // App projects get app-shaped pages.
    expect(pkg.pages.some((p) => p.pageName === "Dashboard")).toBe(true);
  });
  it("markdown brief serializes all major sections", async () => {
    const { pkg } = await generateBuildPackage({ projectType: "Business Website", group: "website", idea: "A plumbing company website for local leads" });
    const md = packageToMarkdown("Test Project", pkg);
    for (const heading of ["# Test Project", "## Positioning", "## Pages", "## Features", "## Roadmap", "## Marketing plan", "## Tech stack"]) {
      expect(md).toContain(heading);
    }
    expect(md).toContain(BUILD_DISCLAIMER);
  });
});
