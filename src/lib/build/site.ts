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

function css(t: Theme): string {
  return `*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:${t.bg};color:${t.fg};font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto}
a{color:${t.accent}}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
header.nav{border-bottom:1px solid ${t.border};background:${t.bg};position:sticky;top:0;z-index:10}
.navrow{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;flex-wrap:wrap}
.brand{font-weight:700;font-size:18px;color:${t.fg};text-decoration:none}
.navlinks{display:flex;gap:18px;flex-wrap:wrap}
.navlinks a{color:${t.muted};text-decoration:none;font-size:14px;font-weight:500}
.navlinks a:hover{color:${t.accent}}
.hero{background:${t.heroBg};color:${t.heroFg};padding:72px 0}
.hero h1{margin:0 0 14px;font-size:clamp(30px,5vw,48px);line-height:1.15;letter-spacing:-.02em}
.hero p{margin:0 0 26px;font-size:clamp(16px,2.2vw,20px);opacity:.85;max-width:62ch}
.btn{display:inline-block;background:${t.accent};color:${t.accentFg};padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px}
.btn:hover{opacity:.92}
section{padding:56px 0}
h2{font-size:clamp(22px,3vw,30px);margin:0 0 10px;letter-spacing:-.01em}
.lead{color:${t.muted};margin:0 0 28px;max-width:70ch}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card{background:${t.card};border:1px solid ${t.border};border-radius:12px;padding:20px}
.card h3{margin:0 0 6px;font-size:17px}
.card p{margin:0;color:${t.muted};font-size:14px}
.cta{background:${t.heroBg};color:${t.heroFg};text-align:center}
footer{border-top:1px solid ${t.border};padding:28px 0;color:${t.muted};font-size:13px}
.foot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
@media(max-width:640px){.hero{padding:52px 0}section{padding:40px 0}}`;
}

function nav(pkg: BuildPackage, pages: BuildPage[], title: string): string {
  const links = pages
    .map((p, i) => `<a href="./${fileFor(p, i)}">${esc(p.pageName)}</a>`)
    .join("");
  return `<header class="nav"><div class="wrap"><div class="navrow">
<a class="brand" href="./index.html">${esc(title)}</a>
<nav class="navlinks">${links}</nav>
</div></div></header>`;
}

function footer(title: string, pkg: BuildPackage): string {
  const year = "2026";
  return `<footer><div class="wrap"><div class="foot">
<span>&copy; ${year} ${esc(title)}</span>
<span>${esc(pkg.brandPositioning).slice(0, 90)}</span>
</div></div></footer>`;
}

function pageHtml(opts: { pkg: BuildPackage; page: BuildPage; pages: BuildPage[]; title: string; theme: Theme; isHome: boolean }): string {
  const { pkg, page, pages, title, theme, isHome } = opts;
  const c = page.copy ?? { headline: page.pageName, subhead: "", cta: "Get started" };
  const desc = String(c.subhead || page.purpose || pkg.brandPositioning || "").slice(0, 155);
  const pageTitle = isHome ? `${title} — ${String(c.headline || "").slice(0, 60)}` : `${page.pageName} — ${title}`;

  const sections = (page.sections ?? []).filter(Boolean).slice(0, 8);
  const sectionCards = sections.length
    ? `<section><div class="wrap"><h2>What&rsquo;s inside</h2><p class="lead">${esc(page.purpose)}</p>
<div class="grid">${sections.map((s) => `<div class="card"><h3>${esc(s)}</h3><p>${esc(page.purpose).slice(0, 110)}</p></div>`).join("")}</div>
</div></section>`
    : "";

  const features = isHome && pkg.features?.length
    ? `<section><div class="wrap"><h2>Features</h2><p class="lead">${esc(pkg.targetAudience)}</p>
<div class="grid">${pkg.features.filter((f) => f.priority === "must").slice(0, 6).map((f) => `<div class="card"><h3>${esc(f.name)}</h3><p>${esc(f.description)}</p></div>`).join("")}</div>
</div></section>`
    : "";

  const body = c.body ? `<section><div class="wrap"><p class="lead">${esc(c.body)}</p></div></section>` : "";

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<style>${css(theme)}</style>
</head><body>
${nav(pkg, pages, title)}
<div class="hero"><div class="wrap">
<h1>${esc(c.headline || page.pageName)}</h1>
<p>${esc(c.subhead || page.purpose)}</p>
${c.cta ? `<a class="btn" href="#contact">${esc(c.cta)}</a>` : ""}
</div></div>
${body}
${sectionCards}
${features}
<section class="cta" id="contact"><div class="wrap">
<h2>${esc(c.cta || "Get in touch")}</h2>
<p class="lead" style="margin-left:auto;margin-right:auto">${esc(pkg.ctaStrategy).slice(0, 160)}</p>
<a class="btn" href="mailto:hello@example.com">${esc(c.cta || "Contact us")}</a>
</div></section>
${footer(title, pkg)}
</body></html>`;
}

export type SiteFile = { path: string; html: string };

/**
 * Render the full static site. Returns one file per blueprint page (first page
 * becomes index.html). All content is escaped — the output is always valid HTML.
 */
export function renderSite(pkg: BuildPackage, opts: { title: string; template?: SiteTemplateId }): SiteFile[] {
  const theme = THEMES[opts.template ?? "modern"] ?? THEMES.modern;
  const title = opts.title || pkg.projectNameIdeas?.[0] || "My site";
  const pages = (pkg.pages ?? []).slice(0, 12);
  if (pages.length === 0) {
    pages.push({ pageName: "Home", purpose: pkg.structureOverview ?? "", sections: [], copy: { headline: title, subhead: pkg.brandPositioning ?? "", cta: "Get started" } });
  }
  return pages.map((page, i) => ({
    path: fileFor(page, i),
    html: pageHtml({ pkg, page, pages, title, theme, isHome: i === 0 }),
  }));
}
