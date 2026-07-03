import { describe, it, expect } from "vitest";
import { clampImageSize, generateDesignImage, willUseRealDesignImages, falImageModel } from "./image";

describe("design image sizing", () => {
  it("caps the longest side at 1440 and preserves aspect ratio", () => {
    const { width, height } = clampImageSize(1920, 1080);
    expect(Math.max(width, height)).toBeLessThanOrEqual(1440);
    expect(width / height).toBeCloseTo(1920 / 1080, 1);
  });
  it("rounds to multiples of 8 and enforces a 256px floor", () => {
    const s = clampImageSize(100, 100);
    expect(s.width % 8).toBe(0);
    expect(s.height % 8).toBe(0);
    expect(s.width).toBeGreaterThanOrEqual(256);
  });
  it("passes through sane sizes unchanged (mod 8)", () => {
    const s = clampImageSize(1024, 1024);
    expect(s).toEqual({ width: 1024, height: 1024 });
  });
});

describe("design image generation (placeholder mode)", () => {
  it("returns a free placeholder when FAL_KEY is not set", async () => {
    if (willUseRealDesignImages()) return; // skip when a real key is present locally
    const r = await generateDesignImage("modern villa exterior", { width: 1344, height: 768 });
    expect(r.usedAI).toBe(false);
    expect(r.url).toContain("picsum.photos");
    expect(r.model).toBe("placeholder");
  });
  it("defaults to FLUX 1.1 Pro unless overridden", () => {
    if (process.env.FAL_IMAGE_MODEL) return;
    expect(falImageModel()).toBe("fal-ai/flux-pro/v1.1");
  });
});
