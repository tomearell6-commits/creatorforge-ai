import "server-only";
import { askJson } from "@/lib/seo/research/analyze";
import { sanitizeBlogHtml } from "@/lib/blog/blog";
import { normalizeSite } from "@/lib/publishing/providers/wordpress";
import { fetchWithTimeout } from "@/lib/http";
import type { EssentialId, FixOffer, SiteScan } from "./site";

/**
 * Carries out the fixes a user paid for. Two honesty rules apply to everything written here:
 *  1. Only facts found on the user's own site are used. Anything unknown becomes a visible
 *     "[Fill in: ...]" marker, never an invented fact (no made-up addresses, dates, numbers or reviews).
 *  2. Legal pages are templates, and are labelled as such.
 * On a connected WordPress site a page is created as a DRAFT (never published); everything else is
 * returned as ready-to-paste text with instructions.
 */
export type FixResult =
  | { kind: "draft_created"; title: string; editUrl: string; previewUrl: string; notes: string[]; placeholders: string[] }
  | { kind: "paste"; title: string; html?: string; code?: string; rows?: { url: string; title: string; description: string }[]; instructions: string[]; notes: string[]; placeholders: string[] };

export type FixContext = { site: SiteScan; wp: { siteUrl: string; username: string; appPassword: string } | null };

const PAGES: Record<string, { title: string; slug: string; brief: string; legal: boolean }> = {
  about: { title: "About Us", slug: "about-us", legal: false, brief: "About page, 300-450 words: who the business is and what it offers (only from the site material), how it works with customers (only if stated), and how to get in touch. Use markers for founding story, location and team." },
  contact: { title: "Contact Us", slug: "contact-us", legal: false, brief: "Contact page, short: how to reach the business. Use ONLY the emails and phone numbers provided; use markers for address, opening hours and typical response time if not provided." },
  faq: { title: "Frequently Asked Questions", slug: "faq", legal: false, brief: "FAQ page with 8-10 questions grouped under h2 headings, each question an h3 followed by a short answer. Pick questions a real visitor to this kind of site asks. Answer only from the site material; for anything specific that is not in the material (prices, delivery times, return windows, payment methods) use a [Fill in: ...] marker inside the answer." },
  privacy: { title: "Privacy Policy", slug: "privacy-policy", legal: true, brief: "Privacy policy TEMPLATE, 500-800 words: what information a website like this collects, how it is used, who it is shared with, cookies and analytics (marker to confirm which tools are used), retention (marker), visitor rights (marker for the region), security, how to contact, changes, effective date (marker). Use a marker for the legal business name and address." },
  terms: { title: "Terms & Conditions", slug: "terms-and-conditions", legal: true, brief: "Terms and conditions TEMPLATE, 500-800 words: use of the site, orders and payment (only methods stated in the material, otherwise a marker), intellectual property, limitation of liability in general terms, governing law (marker for the jurisdiction), changes, contact. Use a marker for the legal business name." },
  returns: { title: "Shipping & Returns Policy", slug: "shipping-and-returns", legal: true, brief: "Shipping and returns policy TEMPLATE: shipping areas, times and costs, returns and refunds window, condition of goods, how to start a return, damaged items. Use ONLY facts from the site material; use [Fill in: ...] markers for every time, cost and window that is not stated." },
};

const LEGAL_NOTE = "This is a general template, not legal advice. Fill in every [Fill in: …] marker and have it reviewed by a qualified person before you publish it.";
const SYSTEM_RULES =
  "You write ONE page for a small business website. Return a JSON object {title:string, html:string, notes:string[]}. " +
  "html uses only h2, h3, p, ul, ol, li, strong, em and a. No h1, no scripts, no styles, no images, no tables. " +
  "HARD RULES: use ONLY facts found in the site material provided. NEVER invent business facts: founding year, team names, addresses, phone numbers, registration or tax numbers, prices, delivery times, return windows, awards, customer counts, reviews, certifications or guarantees. " +
  "Wherever a fact is needed but is not in the material, write a visible marker exactly like [Fill in: what to add]. Do not promise results. " +
  "Write in the site's own language (lang) in a plain, honest, friendly voice.";

const stripMarkers = (html: string) => [...new Set((html.match(/\[Fill in:[^\]]{1,120}\]/g) ?? []))];

function context(site: SiteScan) {
  return {
    host: site.host, lang: site.lang ?? "en", siteName: site.homeTitle, description: site.homeDescription, isShop: site.isShop,
    homeText: site.homeText.slice(0, 2500),
    otherPages: site.pages.filter((p) => p.status === 200).slice(1, 9).map((p) => ({ url: p.url, title: p.title, text: p.snippet.slice(0, 280) })),
    contact: { emails: site.trust.emails, phones: site.trust.phones },
    pagesThatAlreadyExist: site.essentials.filter((e) => e.found).map((e) => ({ page: e.id, url: e.url })),
  };
}

async function wpCreateDraft(wp: NonNullable<FixContext["wp"]>, title: string, html: string, slug: string) {
  const site = normalizeSite(wp.siteUrl);
  const auth = `Basic ${Buffer.from(`${wp.username}:${wp.appPassword.replace(/\s+/g, "")}`).toString("base64")}`;
  try {
    const res = await fetchWithTimeout(`${site}/wp-json/wp/v2/pages`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (compatible; CreatorsForgeSEOFixer/1.0)" },
      body: JSON.stringify({ title, content: html, status: "draft", slug }),
    }, 30_000);
    if (!res.ok) return { ok: false as const, error: `WordPress did not accept the page (HTTP ${res.status}).` };
    const j = (await res.json()) as { id: number; link?: string };
    return { ok: true as const, editUrl: `${site}/wp-admin/post.php?post=${j.id}&action=edit`, previewUrl: j.link ?? `${site}/?page_id=${j.id}&preview=true` };
  } catch {
    return { ok: false as const, error: "Could not reach your WordPress site." };
  }
}

async function createPage(offer: FixOffer, ctx: FixContext): Promise<FixResult> {
  const spec = PAGES[offer.page as string];
  if (!spec) throw new Error("Unknown page type.");
  const out = await askJson<{ title?: string; html?: string; notes?: string[] }>(
    `${SYSTEM_RULES} PAGE TO WRITE: ${spec.brief}`,
    JSON.stringify(context(ctx.site)), 3500, `page-${offer.page}`, [],
  );
  const html = sanitizeBlogHtml(typeof out.html === "string" ? out.html : "");
  if (html.replace(/<[^>]+>/g, " ").trim().length < 250) throw new Error("The page came out too short.");
  const title = (typeof out.title === "string" && out.title.trim()) || spec.title;
  const notes = [...(Array.isArray(out.notes) ? out.notes.filter((n) => typeof n === "string").slice(0, 3) : []), ...(spec.legal ? [LEGAL_NOTE] : [])];
  const placeholders = stripMarkers(html);
  if (placeholders.length) notes.push("Fill in the highlighted [Fill in: …] markers with your real details before publishing.");

  if (ctx.wp) {
    const r = await wpCreateDraft(ctx.wp, title, html, spec.slug);
    if (!r.ok) {
      // The site is connected for posts but will not take pages (for example a custom site): the written page is still worth having.
      return {
        kind: "paste", title, html, placeholders,
        notes: [...notes, `We could not save it as a draft on your connected site (${r.error.replace(/[.]$/, "")}), so here is the page to paste in yourself.`],
        instructions: ["Create a new page in your website editor and paste this text into it.", `Use the page name “${title}” and the address /${spec.slug}.`, "Keep it unpublished until the [Fill in] markers are done."],
      };
    }
    return { kind: "draft_created", title, editUrl: r.editUrl, previewUrl: r.previewUrl, notes: [...notes, "It was saved as a DRAFT. Nothing is public until you publish it."], placeholders };
  }
  return {
    kind: "paste", title, html, placeholders, notes,
    instructions: ["Create a new page in your website editor and paste this text into it.", `Use the page name “${title}” and the address /${spec.slug}.`, "Keep it unpublished until the [Fill in] markers are done."],
  };
}

// ---------------------------------------------------------------- footer (no AI) --

const ESSENTIAL_ORDER: EssentialId[] = ["about", "contact", "faq", "blog", "privacy", "terms", "returns"];
const SUGGESTED_PATH: Record<string, string> = { about: "/about-us/", contact: "/contact-us/", faq: "/faq/", privacy: "/privacy-policy/", terms: "/terms-and-conditions/", returns: "/shipping-and-returns/", blog: "/blog/" };
const LABEL: Record<string, string> = { about: "About us", contact: "Contact", faq: "FAQ", privacy: "Privacy policy", terms: "Terms & conditions", returns: "Shipping & returns", blog: "Blog" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function footerSnippet(site: SiteScan): FixResult {
  const items: string[] = [];
  for (const id of ESSENTIAL_ORDER) {
    const e = site.essentials.find((x) => x.id === id);
    if (!e) continue;
    if (id === "blog" && !e.found) continue; // never link a page that does not exist
    if (id === "returns" && !site.isShop && !e.found) continue;
    const href = e.url ? (() => { try { return new URL(e.url).pathname || "/"; } catch { return e.url; } })() : SUGGESTED_PATH[id];
    items.push(`    <li><a href="${esc(href)}">${LABEL[id]}</a></li>`);
  }
  const name = (site.homeTitle ?? site.host).split(/[|–—-]/)[0].trim() || site.host;
  const email = site.trust.emails[0];
  const phone = site.trust.phones[0];
  const contact = [email ? `Email: <a href="mailto:${esc(email)}">${esc(email)}</a>` : "Email: [Fill in: your email address]", phone ? `Phone: ${esc(phone)}` : null].filter(Boolean).join(" &middot; ");
  const code = `<nav aria-label="Footer">\n  <ul>\n${items.join("\n")}\n  </ul>\n</nav>\n<p>${contact}</p>\n<p>&copy; ${new Date().getFullYear()} ${esc(name)}. All rights reserved.</p>`;
  const placeholders = stripMarkers(code);
  return {
    kind: "paste", title: "Footer block", code, placeholders,
    notes: ["Links to pages that do not exist yet point to the addresses the new pages use (for example /privacy-policy/). Change a link if you publish a page under a different address."],
    instructions: [
      "WordPress: Appearance → Menus → create a menu called “Footer”, add these pages, and set its location to Footer. Or Appearance → Editor → Footer, and paste the block as custom HTML.",
      "Shopify: Online Store → Navigation → Footer menu, add these links; edit the footer text under Themes → Customize.",
      "Any other site: paste the block into your footer template.",
    ],
  };
}

// ------------------------------------------------------------ structured data (no AI) --

export function schemaSnippet(site: SiteScan): FixResult {
  const name = (site.homeTitle ?? site.host).split(/[|–—-]/)[0].trim() || site.host;
  const org: Record<string, unknown> = { "@type": "Organization", "@id": `${site.origin}/#organization`, name, url: site.origin };
  if (site.homeDescription) org.description = site.homeDescription;
  const contactPoint: Record<string, unknown> = { "@type": "ContactPoint", contactType: "customer service" };
  if (site.trust.emails[0]) contactPoint.email = site.trust.emails[0];
  if (site.trust.phones[0]) contactPoint.telephone = site.trust.phones[0];
  if (contactPoint.email || contactPoint.telephone) org.contactPoint = contactPoint;
  const graph = [org, { "@type": "WebSite", "@id": `${site.origin}/#website`, url: site.origin, name, publisher: { "@id": `${site.origin}/#organization` } }];
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replace(/</g, "\\u003c");
  return {
    kind: "paste", title: "Organization and WebSite structured data", code: `<script type="application/ld+json">\n${json}\n</script>`, placeholders: [],
    notes: ["Only facts found on your site are included. Add your logo and social profile links if you have them."],
    instructions: [
      "WordPress with Rank Math: Rank Math → Titles & Meta → Local SEO (Knowledge Graph), and fill in the business details. Or paste this block into a header-code plugin (for example “Insert Headers and Footers”).",
      "Shopify: Online Store → Themes → Edit code → theme.liquid, and paste the block just before </head>.",
      "Any other site: paste the block inside the <head> of your home page.",
      "Then test it at search.google.com/test/rich-results.",
    ],
  };
}

// --------------------------------------------------------------------- metadata (AI) --

function trimTo(s: string, n: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, n).replace(/\s+\S*$/, "").trim();
}

const AI_META_BATCH = 5;

async function metaRewrites(offer: FixOffer, ctx: FixContext): Promise<FixResult> {
  const trace: string[] = [];
  const targets = (offer.targets ?? []).slice(0, 30);
  const byUrl = new Map(ctx.site.pages.map((p) => [p.url, p]));
  const rows: { url: string; title: string; description: string }[] = [];
  let lastError: unknown = null;
  for (let i = 0; i < targets.length; i += AI_META_BATCH) {
    const batch = targets.slice(i, i + AI_META_BATCH).map((u) => byUrl.get(u)).filter((p): p is NonNullable<typeof p> => !!p);
    if (batch.length === 0) continue;
    let out: { pages?: { url?: string; title?: string; description?: string }[] };
    try {
      out = await askJson<{ pages?: { url?: string; title?: string; description?: string }[] }>(
      "You are a careful SEO editor. For each page write a search-result title and meta description. Return {pages:[{url,title,description}]} with one entry per page, same url strings. " +
        "RULES: title 45-60 characters, description 130-155 characters; accurate to what the page contains (use only the material given); the page's main subject near the start; each title and description UNIQUE across the pages; " +
        "no clickbait, no ALL CAPS, no exclamation marks, no invented numbers, prices, years or claims, no promises of results. Write in the page's own language.",
      JSON.stringify({ site: ctx.site.host, lang: ctx.site.lang ?? "en", pages: batch.map((p) => ({ url: p.url, currentTitle: p.title, currentDescription: p.metaDescription, text: p.snippet })) }),
      3000, "meta", trace,
    );
    } catch (e) { lastError = e; continue; }
    for (const p of out.pages ?? []) {
      if (typeof p.url === "string" && byUrl.has(p.url) && typeof p.title === "string" && typeof p.description === "string" && p.title.trim() && p.description.trim()) {
        rows.push({ url: p.url, title: trimTo(p.title, 65), description: trimTo(p.description, 160) });
      }
    }
  }
  if (rows.length === 0) throw Object.assign(lastError instanceof Error ? lastError : new Error("No usable titles came back."), { diag: trace });
  return {
    kind: "paste", title: `Search titles and descriptions (${rows.length} pages)`, rows, placeholders: [],
    notes: ["Written from what each page says today. Read each one and keep only what you agree with."],
    instructions: ["WordPress with Rank Math or Yoast: open each page, scroll to the SEO box, click “Edit snippet”, and paste the title and description.", "Other platforms: look for “SEO title” and “Meta description” in the page settings."],
  };
}

/** Do one paid fix. Throws on failure (the caller then charges nothing). */
export async function runOffer(offer: FixOffer, ctx: FixContext): Promise<FixResult> {
  switch (offer.fix) {
    case "create_page": return createPage(offer, ctx);
    case "footer_links": return footerSnippet(ctx.site);
    case "schema_org": return schemaSnippet(ctx.site);
    case "meta_rewrites": return metaRewrites(offer, ctx);
    default: throw new Error("Unknown fix.");
  }
}
