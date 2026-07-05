import { describe, it, expect } from "vitest";
import { tutorialThumbSvg, tutorialThumbDataUri, wrapTitle } from "./thumb";
import { TUTORIAL_CATEGORIES, COMPLETE_THRESHOLD, SCRIPT_TEMPLATE } from "@/config/tutorialCatalog";

describe("procedural tutorial thumbnails", () => {
  it("renders valid branded 1280x720 SVG", () => {
    const svg = tutorialThumbSvg("Enable 2FA", "Account & Security");
    expect(svg).toContain('width="1280"');
    expect(svg).toContain('height="720"');
    expect(svg).toContain("CreatorsForge");
    expect(svg).toContain("#84cc16"); // lime accent
    expect(svg).toContain("Enable 2FA");
    expect(svg).toContain("Account &amp; Security");
  });
  it("escapes XML-hostile titles", () => {
    const svg = tutorialThumbSvg(`<script>"hack" & 'stuff'`, "x");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });
  it("wraps long titles to at most 3 lines with ellipsis", () => {
    const lines = wrapTitle("A very long tutorial title that should definitely wrap across multiple lines nicely", 20, 3);
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines[2].endsWith("…")).toBe(true);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(21);
  });
  it("produces a usable data URI", () => {
    const uri = tutorialThumbDataUri("Test", "Sub");
    expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(decodeURIComponent(uri)).toContain("<svg");
  });
});

describe("tutorial catalog config", () => {
  it("has the 7 spec categories in order", () => {
    expect(TUTORIAL_CATEGORIES.map((c) => c.name)).toEqual([
      "Getting Started", "Account & Security", "Create", "Grow", "Manage",
      "Business Operations", "Admin & Infrastructure",
    ]);
  });
  it("completion threshold is a sane fraction", () => {
    expect(COMPLETE_THRESHOLD).toBeGreaterThan(0.5);
    expect(COMPLETE_THRESHOLD).toBeLessThanOrEqual(1);
  });
  it("script template enforces the 6 required sections", () => {
    for (const section of ["WELCOME", "WHAT THIS FEATURE DOES", "WHEN TO USE IT", "STEP-BY-STEP", "SAFETY / BILLING", "FINAL ACTION"]) {
      expect(SCRIPT_TEMPLATE).toContain(section);
    }
  });
});
