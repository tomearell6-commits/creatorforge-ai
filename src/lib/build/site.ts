/**
 * Static site renderer — turns a BuildPackage blueprint into a real, deployable
 * multi-page website. CLIENT-SAFE (pure functions, no server-only imports).
 *
 * Deterministic templates + the AI's copy: every site is responsive, valid and
 * looks professional. We never let the model emit raw HTML — all AI/user text is
 * HTML-escaped here, so a blueprint can't inject markup or script.
 */
import type { BuildPackage, BuildPage } from "./package";

export type SiteTemplateId = "modern" | "bold" | "minimal";

export const SITE_TEMPLATES: { id: SiteTemplateId; name: string; blurb: string }[] = [
  { id: "modern", name: "Modern", blurb: "Clean, spacious, deep-green accents. Good for most businesses." },
  { id: "bold", name: "Bold", blurb: "High-contrast dark hero with big type. Good for launches." },
  { id: "minimal", name: "Minimal", blurb: "Understated, typographic, lots of white space." },
];

type Theme = { bg: string; fg: string; muted: string; accent: string; accentFg: string; heroBg: string; heroFg: string; card: string; border: string };

const THEMES: Record<SiteTemplateId, Theme> = {
  modern: { bg: "#ffffff", fg: "#0f1b0a", muted: "#5b6560", accent: "#65a30d", accentFg: "#ffffff", heroBg: "#f7fee7", heroFg: "#1a2e05", card: "#ffffff", border: "#e6e8e3" },
  bold: { bg: "#ffffff", fg: "#0b0f0a", muted: "#5b6560", accent: "#65a30d", accentFg: "#ffffff", heroBg: "#1a2e05", heroFg: "#ecfccb", card: "#ffffff", border: "#e2e4e0" },
  minimal: { bg: "#ffffff", fg: "#1a1a1a", muted: "#6b6b6b", accent: "#1a2e05", accentFg: "#ffffff", heroBg: "#ffffff", heroFg: "#1a1a1a", card: "#fafafa", border: "#e8e8e8" },
};

/** Escape text for HTML text nodes and quoted attributes. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** URL-safe slug (also used for page filenames). */
export function slugify(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "page";
}

function fileFor(page: BuildPage, i: number): string {
  return i === 0 ? "index.html" : `${slugify(page.pageName)}.html`;
}

/** Detail/template pages ("Blog Post", "Product Detail") are destinations you
 *  reach FROM a listing — they don't belong in the top nav. */
const NOT_NAV = /(detail|single|post$|item$|template)/i;

function navPages(pages: BuildPage[]): BuildPage[] {
  const primary = pages.filter((p, i) => i === 0 || !NOT_NAV.test(p.pageName));
  return primary.slice(0, 6);
}

/** A real wordmark: prefer the blueprint's generated brand names over the raw
 *  project title (which is usually the user's prompt, e.g. "build a website"). */
export function brandName(pkg: BuildPackage, title: string): string {
  const idea = pkg.projectNameIdeas?.find((n) => n && n.trim().length > 1);
  if (idea) return idea.trim();
  // Fall back to the title, minus prompt-y verbs.
  const cleaned = title.replace(/^(build|create|make|design)\s+(a|an|my)?\s*/i, "").trim();
  return (cleaned || title).replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40);
}

function css(t: Theme): string {
  return `*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:${t.bg};color:${t.fg};font-family:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
img{max-width:100%;height:auto;display:block}
a{color:${t.accent}}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
header.nav{border-bottom:1px solid ${t.border};background:${t.bg}e6;backdrop-filter:saturate(180%) blur(8px);position:sticky;top:0;z-index:10}
.navrow{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0;flex-wrap:wrap}
.brand{font-weight:800;font-size:19px;letter-spacing:-.02em;color:${t.fg};text-decoration:none}
.navlinks{display:flex;gap:22px;flex-wrap:wrap}
.navlinks a{color:${t.muted};text-decoration:none;font-size:14px;font-weight:500}
.navlinks a:hover,.navlinks a[aria-current="page"]{color:${t.accent}}
.navlinks a[aria-current="page"]{font-weight:600}
.eyebrow{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.7;margin:0 0 14px}
.hero{background:${t.heroBg};color:${t.heroFg};padding:92px 0;border-bottom:1px solid ${t.border}}
.hero h1{margin:0 0 16px;font-size:clamp(32px,5.2vw,54px);line-height:1.08;letter-spacing:-.03em;font-weight:800;max-width:18ch}
.hero p{margin:0 0 30px;font-size:clamp(17px,2.2vw,20px);opacity:.82;max-width:58ch}
.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.btn{display:inline-block;background:${t.accent};color:${t.accentFg};padding:14px 26px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px}
.btn:hover{opacity:.92}
.btn.ghost{background:transparent;color:inherit;border:1px solid currentColor;opacity:.75}
section{padding:72px 0}
section.alt{background:${t.heroBg}}
h2{font-size:clamp(24px,3.2vw,34px);margin:0 0 10px;letter-spacing:-.02em;font-weight:800}
.lead{color:${t.muted};margin:0 0 32px;max-width:68ch;font-size:16px}
.grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:${t.card};border:1px solid ${t.border};border-radius:14px;padding:24px}
.card h3{margin:0 0 8px;font-size:17px;font-weight:700;letter-spacing:-.01em}
.card p{margin:0;color:${t.muted};font-size:14.5px}
.pills{display:flex;flex-wrap:wrap;gap:10px;margin:0;padding:0;list-style:none}
.pills li{border:1px solid ${t.border};border-radius:999px;padding:8px 16px;font-size:14px;font-weight:500;background:${t.card}}
.cta{background:${t.heroBg};color:${t.heroFg};text-align:center}
.cta .actions{justify-content:center}
footer{border-top:1px solid ${t.border};padding:36px 0;color:${t.muted};font-size:13.5px}
.foot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
@media(max-width:640px){.hero{padding:60px 0}section{padding:48px 0}}`;
}

function nav(pages: BuildPage[], brand: string, currentFile: string): string {
  const links = navPages(pages)
    .map((p) => {
      const f = fileFor(p, pages.indexOf(p));
      const current = f === currentFile ? ' aria-current="page"' : "";
      return `<a href="./${f}"${current}>${esc(p.pageName)}</a>`;
    })
    .join("");
  return `<header class="nav"><div class="wrap"><div class="navrow">
<a class="brand" href="./index.html">${esc(brand)}</a>
<nav class="navlinks">${links}</nav>
</div></div></header>`;
}

function footer(brand: string, pkg: BuildPackage, contact: string | null): string {
  const year = "2026";
  return `<footer><div class="wrap"><div class="foot">
<span>&copy; ${year} ${esc(brand)}</span>
${contact ? `<span><a href="mailto:${esc(contact)}">${esc(contact)}</a></span>` : ""}
<span>${esc(pkg.brandPositioning).slice(0, 80)}</span>
</div></div></footer>`;
}

function pageHtml(opts: {
  pkg: BuildPackage; page: BuildPage; pages: BuildPage[]; brand: string;
  theme: Theme; isHome: boolean; contact: string | null; file: string;
}): string {
  const { pkg, page, pages, brand, theme, isHome, contact, file } = opts;
  const c = page.copy ?? { headline: page.pageName, subhead: "", cta: "Get started" };
  const desc = String(c.subhead || page.purpose || pkg.brandPositioning || "").slice(0, 155);
  const pageTitle = isHome ? `${brand} — ${String(c.headline || "").slice(0, 60)}` : `${page.pageName} — ${brand}`;

  // Sections are a table of contents, not fake cards — listing them as pills
  // avoids repeating the same sentence under every heading.
  const sections = (page.sections ?? []).filter(Boolean).slice(0, 8);
  const sectionList = sections.length
    ? `<section class="alt"><div class="wrap">
<p class="eyebrow">On this page</p><h2>What&rsquo;s inside</h2>
<p class="lead">${esc(page.purpose)}</p>
<ul class="pills">${sections.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
</div></section>`
    : "";

  // Features DO have their own descriptions — these are real cards.
  const musts = (pkg.features ?? []).filter((f) => f.priority === "must" && f.description).slice(0, 6);
  const features = isHome && musts.length
    ? `<section><div class="wrap">
<p class="eyebrow">Why ${esc(brand)}</p><h2>Built for what you actually need</h2>
<p class="lead">${esc(pkg.targetAudience)}</p>
<div class="grid">${musts.map((f) => `<div class="card"><h3>${esc(f.name)}</h3><p>${esc(f.description)}</p></div>`).join("")}</div>
</div></section>`
    : "";

  const body = c.body
    ? `<section><div class="wrap"><p class="eyebrow">Overview</p><p class="lead" style="font-size:18px;color:inherit;opacity:.85">${esc(c.body)}</p></div></section>`
    : "";

  // Never ship a placeholder address: link to the real contact if we have one,
  // otherwise point at the site's own Contact page.
  const contactPage = pages.find((p) => /contact/i.test(p.pageName));
  const ctaHref = contact
    ? `mailto:${esc(contact)}`
    : contactPage
      ? `./${fileFor(contactPage, pages.indexOf(contactPage))}`
      : null;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(brand)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<style>${css(theme)}</style>
</head><body>
${nav(pages, brand, file)}
<div class="hero"><div class="wrap">
<p class="eyebrow">${esc(isHome ? pkg.targetAudience.split(",")[0] || brand : page.pageName)}</p>
<h1>${esc(c.headline || page.pageName)}</h1>
<p>${esc(c.subhead || page.purpose)}</p>
<div class="actions">
${c.cta ? `<a class="btn" href="#contact">${esc(c.cta)}</a>` : ""}
${isHome && pages[1] ? `<a class="btn ghost" href="./${fileFor(pages[1], 1)}">${esc(pages[1].pageName)}</a>` : ""}
</div>
</div></div>
${body}
${features}
${sectionList}
<section class="cta" id="contact"><div class="wrap">
<h2>${esc(c.cta || "Get in touch")}</h2>
<p class="lead" style="margin-left:auto;margin-right:auto">${esc(pkg.ctaStrategy).slice(0, 160)}</p>
${ctaHref ? `<div class="actions"><a class="btn" href="${ctaHref}">${esc(c.cta || "Contact us")}</a></div>` : ""}
</div></section>
${footer(brand, pkg, contact)}
</body></html>`;
}

export type SiteFile = { path: string; html: string };

/**
 * Render the full static site. Returns one file per blueprint page (first page
 * becomes index.html). All content is escaped — the output is always valid HTML.
 */
export function renderSite(
  pkg: BuildPackage,
  opts: { title: string; template?: SiteTemplateId; contactEmail?: string | null }
): SiteFile[] {
  const theme = THEMES[opts.template ?? "modern"] ?? THEMES.modern;
  const brand = brandName(pkg, opts.title);
  const contact = opts.contactEmail?.trim() || null;
  const pages = (pkg.pages ?? []).slice(0, 12);
  if (pages.length === 0) {
    pages.push({ pageName: "Home", purpose: pkg.structureOverview ?? "", sections: [], copy: { headline: brand, subhead: pkg.brandPositioning ?? "", cta: "Get started" } });
  }
  return pages.map((page, i) => {
    const file = fileFor(page, i);
    return { path: file, html: pageHtml({ pkg, page, pages, brand, theme, isHome: i === 0, contact, file }) };
  });
}
