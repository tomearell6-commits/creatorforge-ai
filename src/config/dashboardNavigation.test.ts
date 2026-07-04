import { describe, it, expect } from "vitest";
import {
  DASHBOARD_NAV,
  SECTION_REDIRECTS,
  QUICK_CREATE_ITEMS,
  HOME_QUICK_ACTIONS,
  buildNavSearchIndex,
  planSatisfies,
} from "./dashboardNavigation";

const base = (r: string) => r.split("?")[0].split("#")[0];

describe("Create · Grow · Manage config", () => {
  it("has exactly the three areas in order", () => {
    expect(DASHBOARD_NAV.map((a) => a.id)).toEqual(["create", "grow", "manage"]);
    expect(DASHBOARD_NAV.map((a) => a.headline)).toEqual([
      "Create Something",
      "Grow Your Business",
      "Manage Your Account",
    ]);
  });

  it("Create has the 4 studios and Grow has the 4 studios from the spec", () => {
    expect(DASHBOARD_NAV[0].sections.map((s) => s.id)).toEqual([
      "content-studio", "design-studio", "build-studio", "publishing-studio",
    ]);
    expect(DASHBOARD_NAV[1].sections.map((s) => s.id)).toEqual([
      "marketing-studio", "automation-studio", "analytics-studio", "business-studio",
    ]);
    expect(DASHBOARD_NAV[2].sections.map((s) => s.id)).toEqual([
      "billing", "credits", "notifications", "security", "integrations", "settings",
    ]);
  });

  it("every route stays inside /dashboard", () => {
    for (const area of DASHBOARD_NAV) {
      for (const s of area.sections) {
        expect(s.route.startsWith("/dashboard"), s.id).toBe(true);
        for (const c of s.children) expect(c.route.startsWith("/dashboard"), c.id).toBe(true);
      }
    }
  });

  it("no duplicate item labels within a section (spec test 10)", () => {
    for (const area of DASHBOARD_NAV) {
      for (const s of area.sections) {
        const labels = s.children.map((c) => c.label);
        expect(new Set(labels).size, `${s.id} duplicates`).toBe(labels.length);
        const ids = s.children.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it("all 11 guided-tour targets survive the restructure", () => {
    const tours = new Set<string>();
    for (const area of DASHBOARD_NAV) {
      for (const s of area.sections) {
        if (s.tour) tours.add(s.tour);
        for (const c of s.children) if (c.tour) tours.add(c.tour);
      }
    }
    for (const t of [
      "ai-video-studio", "ai-ad-studio", "seo-studio", "wordpress-connect", "social-accounts",
      "render-queue", "publishing-calendar", "credit-topup", "templates", "create-first-design",
      "plan-first-product",
    ]) {
      expect(tours.has(t), `tour target ${t} missing`).toBe(true);
    }
  });

  it("section redirects cover every non-canonical section route", () => {
    expect(Object.keys(SECTION_REDIRECTS).length).toBeGreaterThanOrEqual(13);
    for (const target of Object.values(SECTION_REDIRECTS)) {
      expect(target.startsWith("/dashboard")).toBe(true);
    }
  });

  it("quick create has the 8 spec options; home has 4 actions per area", () => {
    expect(QUICK_CREATE_ITEMS).toHaveLength(8);
    expect(HOME_QUICK_ACTIONS.create).toHaveLength(4);
    expect(HOME_QUICK_ACTIONS.grow).toHaveLength(4);
    expect(HOME_QUICK_ACTIONS.manage).toHaveLength(4);
  });

  it("search index covers sections + enabled children and tags areas", () => {
    const index = buildNavSearchIndex();
    expect(index.length).toBeGreaterThan(60);
    expect(index.some((e) => e.label === "Lead Generator" && e.area === "grow")).toBe(true);
    expect(index.some((e) => e.label === "Payment Methods" && e.area === "manage")).toBe(true);
    expect(index.some((e) => e.label === "CRM")).toBe(false); // disabled = not searchable
  });

  it("plan gate ranks free < creator < pro < agency", () => {
    expect(planSatisfies("free", undefined)).toBe(true);
    expect(planSatisfies("free", "pro")).toBe(false);
    expect(planSatisfies("pro", "pro")).toBe(true);
    expect(planSatisfies("agency", "pro")).toBe(true);
    expect(planSatisfies("creator", "agency")).toBe(false);
    expect(planSatisfies(undefined, "creator")).toBe(false);
  });
});
