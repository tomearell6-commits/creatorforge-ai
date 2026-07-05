/**
 * Company-profile completeness + optimization scoring (pure, deterministic).
 * The AI optimization route layers Claude recommendations on top; this scorer
 * is the source of the number so it never hallucinates.
 */

export type ProfileLike = {
  company_name?: string | null;
  description?: string | null;
  industry?: string | null;
  products_summary?: string | null;
  services_summary?: string | null;
  target_market?: string | null;
  business_hours?: string | null;
  website?: string | null;
  social_links?: Record<string, string> | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  brand_colors?: string[] | null;
  brand_voice?: string | null;
  mission?: string | null;
  story?: string | null;
  certificates?: unknown[] | null;
  awards?: unknown[] | null;
};

export type ProfileScore = {
  score: number; // 0-100
  completeness: number; // 0-100 (fields filled)
  issues: { field: string; label: string; advice: string; weight: number }[];
};

const filled = (v: unknown): boolean => {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
};

export function scoreProfile(p: ProfileLike): ProfileScore {
  const checks: { field: keyof ProfileLike; label: string; weight: number; advice: string; extra?: (p: ProfileLike) => boolean }[] = [
    { field: "company_name", label: "Company name", weight: 10, advice: "Add your company name." },
    { field: "description", label: "Business description", weight: 14, advice: "Write a clear 2–4 sentence description — it feeds SEO and every AI output.", extra: (x) => (x.description ?? "").trim().length >= 80 },
    { field: "industry", label: "Industry", weight: 6, advice: "Pick your industry so content targets the right audience." },
    { field: "products_summary", label: "Products", weight: 7, advice: "Summarize what you sell." },
    { field: "services_summary", label: "Services", weight: 5, advice: "Summarize the services you offer." },
    { field: "target_market", label: "Target market", weight: 7, advice: "Describe your ideal customer — sharpens marketing copy." },
    { field: "website", label: "Website", weight: 6, advice: "Add your website URL." },
    { field: "social_links", label: "Social media links", weight: 6, advice: "Link at least one social profile." },
    { field: "contact_email", label: "Contact email", weight: 6, advice: "Add a contact email so inquiries can be answered." },
    { field: "contact_phone", label: "Contact phone", weight: 3, advice: "Add a phone number." },
    { field: "business_hours", label: "Business hours", weight: 3, advice: "State your business hours." },
    { field: "logo_url", label: "Company logo", weight: 6, advice: "Upload a logo for brand consistency." },
    { field: "brand_colors", label: "Brand colours", weight: 4, advice: "Set brand colours — designs stay on-brand." },
    { field: "brand_voice", label: "Brand voice", weight: 6, advice: "Describe your tone (e.g. friendly expert) — AI replies match it." },
    { field: "mission", label: "Mission statement", weight: 4, advice: "Add a mission statement." },
    { field: "story", label: "Company story", weight: 4, advice: "Tell your story — great for About pages and proposals." },
    { field: "certificates", label: "Certificates", weight: 2, advice: "List certifications for credibility." },
    { field: "awards", label: "Awards", weight: 1, advice: "List awards if you have them." },
  ];

  let earned = 0;
  let filledCount = 0;
  const issues: ProfileScore["issues"] = [];
  const total = checks.reduce((s, chk) => s + chk.weight, 0);

  for (const chk of checks) {
    const has = filled(p[chk.field]);
    const passes = has && (chk.extra ? chk.extra(p) : true);
    if (has) filledCount++;
    if (passes) earned += chk.weight;
    else issues.push({ field: String(chk.field), label: chk.label, advice: chk.advice, weight: chk.weight });
  }

  return {
    score: Math.round((earned / total) * 100),
    completeness: Math.round((filledCount / checks.length) * 100),
    issues: issues.sort((a, b) => b.weight - a.weight),
  };
}
