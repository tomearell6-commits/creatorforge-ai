/**
 * Website category check for SEO Autopilot.
 *
 * CreatorsForge does not write, publish or promote content for websites that sell illegal or
 * prescription-only drugs without a prescription, or cannabis/THC products sold online. This runs
 * BEFORE an analysis is paid for, when auto-posting is switched on, and before every automatic post.
 *
 * It reads what the site itself shows (homepage text, titles, menus). A site is blocked only when
 * it both names prohibited substances AND shows that it sells them (cart, buy, price, shipping).
 * Educational pages that merely discuss a drug are not blocked. Pure function: no network here.
 */

export const POLICY_MESSAGE =
  "This website sells products CreatorsForge can't promote (illegal or prescription-only drugs, or cannabis/THC sold online). " +
  "If you are a licensed business and this is a mistake, contact support with your licence details.";

export class PolicyBlockedError extends Error {
  constructor(message = POLICY_MESSAGE) {
    super(message);
    this.name = "PolicyBlockedError";
  }
}

export type PolicyVerdict = { blocked: boolean; reasons: string[] };

// Always prohibited when sold.
const STRONG = /\b(anabolic steroids?|oral steroids?|injectable steroids?|steroid cycles?|trenbolone|nandrolone|dianabol|stanozolol|winstrol|clenbuterol|hgh|human growth hormone|mdma|ecstasy|molly|cathinone|mephedrone|methamphetamine|crystal meth|cocaine|heroin|fentanyl|psilocybin|magic mushrooms?|shrooms?|lsd|dmt|ayahuasca|mescaline|research chemicals?)\b/gi;
// Prescription-only medicines: fine on a licensed pharmacy that requires a prescription.
const RX = /\b(oxycodone|xanax|alprazolam|adderall|tramadol|diazepam|valium|codeine|hydrocodone|percocet|lorazepam|modafinil|ketamine|letrozole)\b/gi;
// Cannabis / THC products.
const THC = /\b(thc|cannabis|marijuana|dispensary|vape carts?|thc (cartridges?|gummies|vapes?|flower)|cannabis flower|delta[- ]?[89]|pre[- ]?rolls?|moonrocks?)\b/gi;
// Terms that only appear on a shop for cannabis products (a CBD/hemp page that says "THC-free" must not match).
const THC_PRODUCT = /\b(dispensary|vape carts?|thc (cartridges?|gummies|vapes?|flower)|cannabis flower|delta[- ]?[89]|pre[- ]?rolls?|moonrocks?)\b/i;

// The site is actually selling (not just discussing).
const SELLING = /(add to cart|buy now|\bbuy\b|shop now|checkout|order now|free shipping|\bin stock\b|[$€£]\s?\d)/gi;
// Hiding shipments or skipping prescriptions.
const EVASION = /(discreet(ly)?\s+(shipping|packag\w+|deliver\w+|us delivery)|stealth\s+(shipping|packag\w+)|x-?ray|evade customs|customs (can'?t|cannot)|no prescription|without (a )?prescription|soft toys|carbon (photo )?paper)/i;
// Signs of a lawful, regulated seller.
const RX_OK = /(prescription required|valid prescription|requires? a prescription|licensed pharmac\w+|nabp|pharmacy licen[cs]e|registered pharmacy|gphc|tga approved)/i;
const THC_LICENSED = /(licen[cs]e\s*(no\.?|number|#)|licensed (cannabis )?(dispensary|retailer|producer|operator)|state[- ]licensed|cannabis licen[cs]e)/i;

const distinct = (re: RegExp, text: string): string[] => {
  const seen = new Set<string>();
  for (const m of text.matchAll(re)) seen.add(m[0].toLowerCase().replace(/\s+/g, " "));
  return [...seen];
};

export function screenSiteContent(raw: string): PolicyVerdict {
  const text = (raw || "").replace(/\s+/g, " ").slice(0, 60_000);
  if (text.length < 80) return { blocked: false, reasons: [] };

  const selling = [...text.matchAll(SELLING)].length;
  if (selling < 2) return { blocked: false, reasons: [] }; // not a shop: discussion only

  const strong = distinct(STRONG, text);
  const rx = RX_OK.test(text) && !EVASION.test(text) ? [] : distinct(RX, text);
  const thc = THC_LICENSED.test(text) && !EVASION.test(text) ? [] : distinct(THC, text);
  const evasion = EVASION.test(text);

  const reasons: string[] = [];
  if (strong.length >= 2 || (strong.length >= 1 && evasion)) reasons.push(`sells controlled substances (${strong.slice(0, 4).join(", ")})`);
  if (rx.length >= 2 || (rx.length >= 1 && evasion)) reasons.push(`sells prescription-only drugs without a prescription (${rx.slice(0, 4).join(", ")})`);
  if ((thc.length >= 3 && THC_PRODUCT.test(text)) || (thc.length >= 1 && evasion && THC_PRODUCT.test(text))) reasons.push(`sells cannabis/THC products online (${thc.slice(0, 4).join(", ")})`);

  return { blocked: reasons.length > 0, reasons };
}
