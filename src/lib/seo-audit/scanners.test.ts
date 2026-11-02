import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { imageSeoScanner, isDecorativeImage } from "./scanners";

describe("decorative images", () => {
  it("recognises the real ones found on petsupplydirect.shop (theme background, commenter avatar)", () => {
    expect(isDecorativeImage('<img src="https://petsupplydirect.shop/wp/wp-content/themes/flatsome/assets/img/missing.jpg" class="bg" alt="">')).toBe(true);
    expect(isDecorativeImage('<img alt="" src="https://secure.gravatar.com/avatar/5376a6?s=90&amp;d=mm&amp;r=g" class="avatar avatar-90 photo" height="90" width="90" decoding="async">')).toBe(true);
  });
  it("recognises pictures the page itself marks as decoration, and tracking pixels", () => {
    expect(isDecorativeImage('<img src="a.png" role="presentation">')).toBe(true);
    expect(isDecorativeImage('<img src="a.png" aria-hidden="true">')).toBe(true);
    expect(isDecorativeImage('<img src="https://t.example/p.gif" width="1" height="1" alt="">')).toBe(true);
    expect(isDecorativeImage('<img src="/img/spacer.gif" alt="">')).toBe(true);
  });
  it("never treats a real gap as decoration", () => {
    expect(isDecorativeImage('<img src="/uploads/dog-bowl.jpg">')).toBe(false); // no alt attribute at all
    expect(isDecorativeImage('<img src="/uploads/dog-bowl.jpg" alt="">')).toBe(false); // a content picture with an empty alt
    expect(isDecorativeImage('<img src="/uploads/dog-bowl.jpg" class="wp-post-image" alt="">')).toBe(false);
    expect(isDecorativeImage('<img src="/uploads/dog-bowl.jpg" alt="Steel dog bowl">')).toBe(false);
    expect(isDecorativeImage('<img src="/uploads/dog-bowl.jpg" width="600" height="400">')).toBe(false);
  });
});

describe("imageSeoScanner", () => {
  const page = [
    '<img src="/a.jpg" alt="Steel dog bowl">',
    '<img src="/b.jpg" alt="">',                                  // real gap
    '<img src="/c.jpg">',                                         // real gap
    '<img src="/themes/x/missing.jpg" class="bg" alt="">',        // decoration
    '<img alt="" src="https://secure.gravatar.com/avatar/1" class="avatar">', // decoration
  ].join("");
  it("counts only real pictures, so decoration neither adds to the gaps nor to the total", () => {
    expect(imageSeoScanner(page)).toEqual({ imageCount: 3, imagesMissingAlt: 2 });
  });
  it("is unchanged for a page with no decoration", () => {
    expect(imageSeoScanner('<img src="/a.jpg" alt="x"><img src="/b.jpg">')).toEqual({ imageCount: 2, imagesMissingAlt: 1 });
    expect(imageSeoScanner("<p>no images</p>")).toEqual({ imageCount: 0, imagesMissingAlt: 0 });
  });
});
