import { describe, expect, it } from "vitest";
import { screenSiteContent } from "./policy";

const pad = " Our company profile and contact details are available on this page for visitors. ".repeat(3);

describe("website category check", () => {
  it("blocks a shop selling steroids, HGH, MDMA and hiding shipments", () => {
    const t = `TrustMediHealth Online Pharmacy. Shop Oral Steroids, Injectable Steroids, HGH, MDMA, Cathinone. Add to cart $59.00. We usually ship in soft toys. We use carbon photo paper to wrap things. The X-ray cannot penetrate. Free shipping.${pad}`;
    const v = screenSiteContent(t);
    expect(v.blocked).toBe(true);
    expect(v.reasons.join(" ")).toMatch(/controlled substances/);
  });
  it("blocks a shop selling psilocybin, LSD and DMT with discreet delivery", () => {
    const v = screenSiteContent(`Buy Psychedelic Mushroom. Premium psilocybin mushrooms, magic mushroom gummies, LSD, DMT. Discreet US delivery. Buy now. Free shipping on orders over $150.${pad}`);
    expect(v.blocked).toBe(true);
  });
  it("blocks an online THC vape and flower shop", () => {
    const v = screenSiteContent(`Buy Muha Meds Carts & Disposables Online. cannabis vape. THC cartridges, Pre Rolls, Disposables, Gummies, flower by the lb. Buy $25.00 Add to cart. Shipping and Returns.${pad}`);
    expect(v.blocked).toBe(true);
    expect(v.reasons.join(" ")).toMatch(/cannabis/);
  });
  it("blocks no-prescription prescription drugs", () => {
    const v = screenSiteContent(`Order Xanax and Adderall online without a prescription. Buy now $2 per pill. Free shipping.${pad}`);
    expect(v.blocked).toBe(true);
  });
  it("does not block an ordinary fertiliser business", () => {
    const v = screenSiteContent(`Natures Fertilizer Pty Ltd. Bulk urea, DAP, MAP, SOP. Request a quote. Delivery Australia-wide. Buy bulk bags $450 per tonne. Add to cart. Free shipping on pallets.${pad}`);
    expect(v.blocked).toBe(false);
  });
  it("does not block a garden shop selling weed killer or a candle shop selling wax", () => {
    expect(screenSiteContent(`Garden supplies. Weed killer, weed mat, wax candles, edibles garden herbs. Add to cart $12. Buy now. Free shipping.${pad}`).blocked).toBe(false);
  });
  it("does not block a CBD/hemp shop that says THC-free", () => {
    expect(screenSiteContent(`Hemp CBD oil, THC-free, derived from hemp, not cannabis flower. Buy now $30. Add to cart. Free shipping.${pad}`).blocked).toBe(false);
  });
  it("does not block an educational article that only discusses a drug (no shop)", () => {
    expect(screenSiteContent(`What the research says about MDMA-assisted therapy, psilocybin and LSD. Clinical trials, risks, and legal status. Read more about the science.${pad}`).blocked).toBe(false);
  });
  it("does not block a licensed pharmacy that requires a prescription", () => {
    expect(screenSiteContent(`Licensed pharmacist on site. Prescription required for Tramadol, Diazepam and Codeine. Order now. Free shipping on prescriptions. Price $12.${pad}`).blocked).toBe(false);
  });
  it("lets a licensed dispensary that shows its licence number through", () => {
    expect(screenSiteContent(`State-licensed dispensary. License number C10-0000123. Cannabis flower, pre-rolls, THC gummies. Shop now. In stock $35. Pickup only.${pad}`).blocked).toBe(false);
  });
  it("ignores very short or empty pages", () => {
    expect(screenSiteContent("").blocked).toBe(false);
    expect(screenSiteContent("MDMA buy now").blocked).toBe(false);
  });
});
