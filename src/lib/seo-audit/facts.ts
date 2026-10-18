/**
 * The real facts a site owner tells us once, so written pages are finished rather than full of "[Fill in]"
 * markers. Shared by the form (browser) and the page writer (server), so no server-only imports here.
 * Everything is optional, and only what the owner typed is ever used.
 */
export type FactKey =
  | "businessName" | "legalName" | "email" | "phone" | "address" | "hours" | "about" | "founded"
  | "payment" | "shipping" | "refunds" | "replyTime" | "taxes" | "jurisdiction" | "tools";

export type FactField = { key: FactKey; label: string; hint: string; long?: boolean; usedBy: string };

export const FACT_FIELDS: FactField[] = [
  { key: "businessName", label: "Business name", hint: "As customers know it", usedBy: "All pages" },
  { key: "about", label: "Who you are and what you do", hint: "One or two sentences in your own words", long: true, usedBy: "About, FAQ" },
  { key: "founded", label: "Year you started", hint: "For example 2021", usedBy: "About" },
  { key: "email", label: "Contact email", hint: "The address customers write to", usedBy: "Contact, footer, policies" },
  { key: "phone", label: "Phone number", hint: "Leave empty if you do not take calls", usedBy: "Contact, footer" },
  { key: "address", label: "Business address", hint: "Street, city, country. Leave empty if online only", usedBy: "Contact, footer, policies" },
  { key: "hours", label: "Opening hours", hint: "For example Mon-Fri 9am-5pm", usedBy: "Contact" },
  { key: "replyTime", label: "How fast you reply", hint: "For example within 1 business day", usedBy: "Contact, FAQ" },
  { key: "payment", label: "Payment methods you accept", hint: "For example card, bank transfer, crypto", usedBy: "FAQ, Terms" },
  { key: "shipping", label: "Shipping or delivery", hint: "Where you deliver, how long it takes, what it costs", long: true, usedBy: "FAQ, Shipping & returns" },
  { key: "refunds", label: "Refunds and returns", hint: "The window and conditions, for example 14 days, unused items", long: true, usedBy: "FAQ, Returns, Terms" },
  { key: "taxes", label: "Tax or VAT on prices", hint: "Included in the price, or added at checkout", usedBy: "FAQ, Terms" },
  { key: "legalName", label: "Legal business name", hint: "Only if different from the name above", usedBy: "Privacy, Terms" },
  { key: "jurisdiction", label: "Country or state whose law applies", hint: "For example California, USA", usedBy: "Terms, Privacy" },
  { key: "tools", label: "Analytics or ad tools on your site", hint: "For example Google Analytics, Meta Pixel, or none", usedBy: "Privacy" },
];

export type BusinessFacts = Partial<Record<FactKey, string>>;

const KEYS = new Set<string>(FACT_FIELDS.map((f) => f.key));
const MAX_LEN: Record<string, number> = { about: 600, shipping: 500, refunds: 500 };

/** Keep only known fields, as short plain text. Anything else in the input is dropped. */
export function cleanFacts(input: unknown): BusinessFacts {
  const out: BusinessFacts = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!KEYS.has(k) || typeof v !== "string") continue;
    // eslint-disable-next-line no-control-regex
    const t = v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_LEN[k] ?? 250);
    if (t) out[k as FactKey] = t;
  }
  return out;
}

export const countFacts = (f: BusinessFacts | null | undefined) => Object.keys(cleanFacts(f ?? {})).length;
