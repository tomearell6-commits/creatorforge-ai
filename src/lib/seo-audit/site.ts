/**
 * Whole-site analysis for the SEO Audit: which essential pages exist, whether the footer does its job,
 * duplicate / missing metadata, and the itemised "fix it for me" offers with their credit prices.
 * Pure functions (no network) so every rule is testable. The crawler (crawl.ts) feeds them.
 */
import type { AuditIssue } from "./types";
import { SEO_AUDIT_FIX_PRICES } from "@/lib/constants";

export type EssentialId = "about" | "contact" | "faq" | "privacy" | "terms" | "returns" | "blog";

export type PageScan = {
  url: string; status: number; title: string | null; metaDescription: string | null;
  h1Count: number; words: number; imageCount: number; imagesMissingAlt: number; internalLinks: number;
  schemaTypes: string[]; canonical: string | null; noindex: boolean; snippet: string;
};
export type PageLink = { href: string; text: string; inFooter: boolean };
export type EssentialStatus = { id: EssentialId; label: string; required: boolean; found: boolean; url: string | null; linkedFromFooter: boolean };
export type FooterInfo = { found: boolean; linkCount: number; hasContact: boolean; hasCopyright: boolean; essentialsLinked: EssentialId[] };
export type TrustInfo = { emails: string[]; phones: string[]; addressHint: boolean };

export type SiteScan = {
  origin: string; host: string; pagesCrawled: number; pagesDiscovered: number;
  pages: PageScan[]; isShop: boolean; lang: string | null;
  essentials: EssentialStatus[]; footer: FooterInfo; trust: TrustInfo;
  duplicateTitles: { value: string; urls: string[] }[];
  duplicateDescriptions: { value: string; urls: string[] }[];
  missingDescriptions: string[]; missingH1: string[]; thinPages: string[]; badTitleLength: string[];
  imagesMissingAlt: number; schemaOnHome: string[]; brokenLinks: string[];
  homeTitle: string | null; homeDescription: string | null; homeText: string;
};

// ---------------------------------------------------------------- essential pages --

export const ESSENTIALS: { id: EssentialId; label: string; re: RegExp; requiredAlways: boolean }[] = [
  { id: "about", label: "About page", re: /\b(about|our[- ]story|who[- ]we[- ]are|our[- ]company)\b/i, requiredAlways: true },
  { id: "contact", label: "Contact page", re: /\b(contact|get[- ]in[- ]touch|reach[- ]us)\b/i, requiredAlways: true },
  { id: "faq", label: "FAQ page", re: /\b(faqs?|frequently[- ]asked|common[- ]questions)\b/i, requiredAlways: true },
  { id: "privacy", label: "Privacy policy", re: /\bprivacy\b/i, requiredAlways: true },
  { id: "terms", label: "Terms & conditions", re: /\b(terms|conditions|tos)\b/i, requiredAlways: true },
  { id: "returns", label: "Shipping & returns policy", re: /\b(returns?|refunds?|shipping|delivery)\b/i, requiredAlways: false },
  { id: "blog", label: "Blog / articles", re: /\b(blog|news|articles?|guides|insights|resources)\b/i, requiredAlways: false },
];

const strip = (h: string) => h.replace(/^www\./, "").toLowerCase();
const samePath = (u: string) => { try { const p = new URL(u); return `${strip(p.hostname)}${p.pathname.replace(/\/+$/, "")}`; } catch { return u; } };

/** Does this address or link text look like the given essential page? */
export function matchesEssential(id: EssentialId, url: string, text = "", title = ""): boolean {
  const def = ESSENTIALS.find((e) => e.id === id);
  if (!def) return false;
  let path = url;
  try { path = new URL(url).pathname; } catch { /* keep as is */ }
  const isRoot = path === "/" || path === "";
  if (isRoot) return false;
  return def.re.test(path) || def.re.test(text) || def.re.test(title);
}

/** Which essential pages exist. A page counts only if it was fetched and answered 200. */
export function detectEssentials(pages: PageScan[], links: PageLink[], isShop: boolean): EssentialStatus[] {
  const ok = pages.filter((p) => p.status === 200);
  return ESSENTIALS.map((def) => {
    const required = def.requiredAlways || (def.id === "returns" && isShop);
    const page = ok.find((p) => matchesEssential(def.id, p.url, "", p.title ?? ""));
    const linked = links.find((l) => l.inFooter && matchesEssential(def.id, l.href, l.text) && ok.some((p) => samePath(p.url) === samePath(l.href)));
    return { id: def.id, label: def.label, required, found: !!page, url: page?.url ?? null, linkedFromFooter: !!linked };
  });
}

/** Looks like an online shop (cart, checkout, prices, product pages). */
export function looksLikeShop(text: string, urls: string[]): boolean {
  if (/(add to cart|shopping cart|checkout|\bbuy now\b|\bshop now\b|[$€£]\s?\d)/i.test(text)) return true;
  return urls.some((u) => /\/(shop|product|products|cart|store)(\/|$)/i.test(u));
}

// -------------------------------------------------------------------- trust & footer --

export function findTrust(text: string): TrustInfo {
  const emails = [...new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((e) => e.toLowerCase()))].filter((e) => !/\.(png|jpg|jpeg|gif|webp|svg)$/.test(e)).slice(0, 3);
  const phones = [...new Set((text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{2,4})?/g) ?? []).map((p) => p.trim()))].filter((p) => p.replace(/\D/g, "").length >= 8).slice(0, 3);
  const addressHint = /\b\d{1,5}\s+[A-Za-z][A-Za-z .'-]{2,}\s+(street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|drive|dr\.?|boulevard|blvd|way|place|court|highway|hwy)\b/i.test(text);
  return { emails, phones, addressHint };
}

export function analyseFooter(footerHtml: string | null, links: PageLink[], essentials: EssentialStatus[]): FooterInfo {
  if (!footerHtml) return { found: false, linkCount: 0, hasContact: false, hasCopyright: false, essentialsLinked: [] };
  const text = footerHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const footerLinks = links.filter((l) => l.inFooter);
  return {
    found: true,
    linkCount: footerLinks.length,
    hasContact: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(footerHtml) || /\+?\d[\d\s().-]{7,}\d/.test(text) || /mailto:|tel:/i.test(footerHtml),
    hasCopyright: /(©|&copy;|copyright)/i.test(footerHtml),
    essentialsLinked: essentials.filter((e) => e.linkedFromFooter).map((e) => e.id),
  };
}

// ------------------------------------------------------------------ duplicates etc. --

export function findDuplicates(pages: PageScan[], pick: (p: PageScan) => string | null): { value: string; urls: string[] }[] {
  const by = new Map<string, string[]>();
  for (const p of pages) {
    if (p.status !== 200) continue;
    const v = pick(p)?.trim().toLowerCase();
    if (!v) continue;
    by.set(v, [...(by.get(v) ?? []), p.url]);
  }
  return [...by.entries()].filter(([, urls]) => urls.length > 1).map(([value, urls]) => ({ value, urls }));
}

// ----------------------------------------------------------------------- issues --

export function siteIssues(s: SiteScan): AuditIssue[] {
  const out: AuditIssue[] = [];
  const add = (issue_type: AuditIssue["issue_type"], severity: AuditIssue["severity"], title: string, description: string, fix: string, affected?: string) =>
    out.push({ issue_type, severity, title, description, recommended_fix: fix, affected_url: affected ?? s.origin });

  for (const e of s.essentials) {
    if (e.id === "blog") continue; // a recommendation, not a fault
    if (!e.found && e.required) add("content", e.id === "privacy" || e.id === "terms" ? "critical" : "warning", `Missing: ${e.label}`, `No ${e.label.toLowerCase()} was found on the pages checked. Visitors and search engines look for it to trust a site.`, `Create a ${e.label.toLowerCase()} and link it from the footer.`);
    else if (e.found) add("content", "passed", `${e.label} found`, e.url ?? "", "");
  }
  const blog = s.essentials.find((e) => e.id === "blog");
  if (blog && !blog.found) add("content", "warning", "No blog or articles section", "A blog is the main way a site earns new search traffic over time.", "Start publishing helpful articles (SEO Autopilot can write and publish them daily).");

  if (!s.footer.found) add("technical", "warning", "No footer found", "The pages have no footer section, so visitors cannot find policies or contact details.", "Add a footer with your policy links and contact details.");
  else {
    const missingLinks = s.essentials.filter((e) => e.found && e.required && !e.linkedFromFooter).map((e) => e.label);
    if (missingLinks.length) add("links", "warning", "Footer does not link to key pages", `The footer does not link to: ${missingLinks.join(", ")}.`, "Add these links to the footer so every page leads to them.");
    if (!s.footer.hasContact) add("content", "warning", "No contact details in the footer", "Visitors expect an email, phone or address in the footer.", "Add your contact details to the footer.");
    if (!s.footer.hasCopyright) add("content", "warning", "No copyright line in the footer", "A copyright line with the business name is a basic trust signal.", "Add “© year Business name” to the footer.");
  }
  if (s.trust.emails.length === 0 && s.trust.phones.length === 0 && !s.trust.addressHint) add("content", "warning", "No contact details found anywhere", "No email address, phone number or address was visible on the pages checked.", "Show at least an email address and, if you have one, a phone number and address.");

  if (s.duplicateTitles.length) add("onpage", "warning", "Pages share the same title", `${s.duplicateTitles.length} title${s.duplicateTitles.length === 1 ? " is" : "s are"} used on more than one page.`, "Give every page its own title.", s.duplicateTitles[0].urls[0]);
  if (s.missingDescriptions.length) add("onpage", s.missingDescriptions.length > s.pagesCrawled / 2 ? "critical" : "warning", "Pages without a meta description", `${s.missingDescriptions.length} of ${s.pagesCrawled} pages checked have no meta description.`, "Write a 140–160 character description for each page.", s.missingDescriptions[0]);
  if (s.missingH1.length) add("content", "warning", "Pages without a main heading (H1)", `${s.missingH1.length} pages have no H1.`, "Give every page exactly one H1.", s.missingH1[0]);
  if (s.thinPages.length) add("content", "warning", "Thin pages", `${s.thinPages.length} pages have under 300 words.`, "Expand them with useful, original content or merge them.", s.thinPages[0]);
  if (s.imagesMissingAlt > 0) add("images", "warning", "Images without alt text (whole site)", `${s.imagesMissingAlt} images across the pages checked have no alt text.`, "Add a short description to every meaningful image.");
  if (s.brokenLinks.length) add("links", "critical", "Broken internal links", `${s.brokenLinks.length} internal links lead to pages that do not load.`, "Fix or remove them.", s.brokenLinks[0]);

  const home = s.schemaOnHome.join(" ");
  if (!/(Organization|LocalBusiness|WebSite|Store|Corporation)/i.test(home)) add("schema", "warning", "No business structured data on the home page", "Organization / WebSite markup helps search engines understand who you are.", "Add Organization and WebSite structured data.");
  return out;
}

/** Deduct a little from the content score for each site-level fault (kept modest and capped). */
export function sitePenalty(s: SiteScan): number {
  let p = 0;
  p += Math.min(20, s.essentials.filter((e) => e.required && !e.found).length * 4);
  if (!s.footer.found) p += 4;
  if (s.duplicateTitles.length) p += 3;
  if (s.pagesCrawled && s.missingDescriptions.length / s.pagesCrawled > 0.3) p += 4;
  if (s.brokenLinks.length) p += 4;
  return Math.min(30, p);
}

// ------------------------------------------------------------------------- offers --

export type FixKind = "create_page" | "footer_links" | "schema_org" | "meta_rewrites";
export type FixOffer = {
  id: string; fix: FixKind; page?: EssentialId; title: string; why: string; credits: number;
  mode: "auto" | "paste"; severity: "critical" | "warning"; targets?: string[];
};

export const CREATABLE: EssentialId[] = ["about", "contact", "faq", "privacy", "terms", "returns"];
const PAGE_LABEL: Record<string, string> = { about: "About page", contact: "Contact page", faq: "FAQ page", privacy: "Privacy policy", terms: "Terms & conditions", returns: "Shipping & returns policy" };
export const META_BATCH = 10;

/** Itemised fixes with their credit prices. `wordpress` = the user has this site connected, so pages can be created as drafts. */
export function buildOffers(s: SiteScan, wordpress: boolean): FixOffer[] {
  const offers: FixOffer[] = [];
  for (const e of s.essentials) {
    if (e.found || !e.required || !CREATABLE.includes(e.id)) continue;
    const legal = e.id === "privacy" || e.id === "terms" || e.id === "returns";
    offers.push({
      id: `create_page:${e.id}`, fix: "create_page", page: e.id,
      title: `Write your ${PAGE_LABEL[e.id]}`,
      why: legal ? "Visitors and Google expect it. Written as a template with fill-in markers; please have it checked before publishing." : "A site without it looks unfinished and is harder to trust.",
      credits: SEO_AUDIT_FIX_PRICES.create_page, mode: wordpress ? "auto" : "paste",
      severity: e.id === "privacy" || e.id === "terms" ? "critical" : "warning",
    });
  }

  const needFooter = !s.footer.found || !s.footer.hasContact || s.essentials.some((e) => e.found && e.required && !e.linkedFromFooter) || offers.length > 0;
  if (needFooter) offers.push({ id: "footer_links", fix: "footer_links", title: "Footer with the right links and contact line", why: "Every page should lead to your policies and contact details. Ready-to-paste footer block with instructions for your site.", credits: SEO_AUDIT_FIX_PRICES.footer_links, mode: "paste", severity: "warning" });

  if (!/(Organization|LocalBusiness|WebSite|Store|Corporation)/i.test(s.schemaOnHome.join(" "))) {
    offers.push({ id: "schema_org", fix: "schema_org", title: "Business structured data (Organization + WebSite)", why: "Helps Google understand who you are and can improve how your site appears in results. Ready-to-paste code.", credits: SEO_AUDIT_FIX_PRICES.schema_org, mode: "paste", severity: "warning" });
  }

  const metaTargets = [...new Set([
    ...s.missingDescriptions, ...s.duplicateTitles.flatMap((d) => d.urls), ...s.duplicateDescriptions.flatMap((d) => d.urls), ...s.badTitleLength,
  ])].slice(0, 30);
  if (metaTargets.length) {
    const batches = Math.ceil(metaTargets.length / META_BATCH);
    offers.push({
      id: "meta_rewrites", fix: "meta_rewrites", title: `Better search titles and descriptions for ${metaTargets.length} page${metaTargets.length === 1 ? "" : "s"}`,
      why: "Pages with missing, duplicate or badly sized titles and descriptions lose clicks. A table you can paste into your SEO plugin.",
      credits: SEO_AUDIT_FIX_PRICES.meta_rewrites * batches, mode: "paste", severity: "warning", targets: metaTargets,
    });
  }
  return offers;
}
