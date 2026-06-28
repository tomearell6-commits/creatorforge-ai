import { describe, it, expect } from "vitest";
import { normalizeSite } from "./wordpress";

describe("normalizeSite", () => {
  it("adds https when missing", () => {
    expect(normalizeSite("petsupplydirect.shop")).toBe("https://petsupplydirect.shop");
  });
  it("strips trailing slashes", () => {
    expect(normalizeSite("https://petsupplydirect.shop/")).toBe("https://petsupplydirect.shop");
  });
  it("strips a trailing /wp-json path", () => {
    expect(normalizeSite("https://petsupplydirect.shop/wp-json/")).toBe("https://petsupplydirect.shop");
  });
  it("preserves existing http scheme", () => {
    expect(normalizeSite("http://localhost:8080")).toBe("http://localhost:8080");
  });
});
