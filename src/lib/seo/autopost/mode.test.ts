import { describe, expect, it } from "vitest";
import { needsReview, parseMode, REVIEW_FIRST_COUNT } from "./limits";
import { chooseCategory, cleanCategory } from "./category";

describe("publishing mode", () => {
  it("auto never asks for review", () => {
    expect(needsReview("auto", 0)).toBe(false);
    expect(needsReview(undefined, 0)).toBe(false);
  });
  it("review always asks", () => {
    expect(needsReview("review", 0)).toBe(true);
    expect(needsReview("review", 500)).toBe(true);
  });
  it("first3 reviews only the first articles, then goes automatic", () => {
    expect(needsReview("first3", 0)).toBe(true);
    expect(needsReview("first3", REVIEW_FIRST_COUNT - 1)).toBe(true);
    expect(needsReview("first3", REVIEW_FIRST_COUNT)).toBe(false);
  });
  it("parses only known modes", () => {
    expect(parseMode("first3")).toBe("first3");
    expect(parseMode("nonsense")).toBeNull();
  });
});

describe("category choice", () => {
  it("the owner's own category wins", () => {
    expect(chooseCategory({ siteDefault: "Container supplier", fromWriter: "Soil Health" })).toBe("Container Supplier");
  });
  it("uses the writer's category when it is specific", () => {
    expect(chooseCategory({ fromWriter: "buying guides" })).toBe("Buying Guides");
  });
  it("rejects generic or odd categories and falls back by intent", () => {
    expect(cleanCategory("Uncategorized")).toBeNull();
    expect(cleanCategory("Blog")).toBeNull();
    expect(cleanCategory("<b>x</b>")).toBeNull();
    expect(cleanCategory("a very long category name that is not ok")).toBeNull();
    expect(chooseCategory({ fromWriter: "Blog", intent: "Commercial" })).toBe("Buying Guides");
    expect(chooseCategory({ fromWriter: "", intent: "Informational" })).toBe("Guides");
  });
});
