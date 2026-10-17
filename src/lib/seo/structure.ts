/**
 * Article structure quality: validate the H1/H2/H3 hierarchy and add a professional
 * "In this article" table of contents with anchor links.
 *
 * The page title is the H1 (supplied separately), so article bodies must start with
 * an intro paragraph and then use H2 sections with H3 sub-sections — no H1, no
 * skipped levels, no H4+, no empty or duplicate headings, no thin sections.
 */

export type StructureReport = { ok: boolean; issues: string[]; h2: number; h3: number };

const HEADING_RE = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;

function text(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}
const words = (html: string) => text(html).split(" ").filter(Boolean).length;

export function analyzeStructure(html: string, opts: { minH2?: number; minSectionWords?: number } = {}): StructureReport {
  const minH2 = opts.minH2 ?? 6;
  const minSection = opts.minSectionWords ?? 80;
  const issues: string[] = [];

  const heads: { level: number; text: string; start: number; end: number }[] = [];
  for (const m of html.matchAll(HEADING_RE)) {
    heads.push({ level: Number(m[1]), text: text(m[3]), start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }

  if (heads.some((h) => h.level === 1)) issues.push("contains an H1 (the page title already is the H1 — use H2/H3 only)");
  if (heads.some((h) => h.level >= 4)) issues.push("uses H4–H6 (use only H2 and H3)");
  if (heads.some((h) => !h.text)) issues.push("has an empty heading");

  const h2s = heads.filter((h) => h.level === 2);
  const h3s = heads.filter((h) => h.level === 3);
  if (h2s.length < minH2) issues.push(`has only ${h2s.length} H2 sections (need at least ${minH2})`);

  const firstH2 = h2s[0];
  const firstH3 = h3s[0];
  if (firstH3 && (!firstH2 || firstH3.start < firstH2.start)) issues.push("an H3 appears before the first H2 (skipped heading level)");

  const dup = new Set<string>();
  for (const h of h2s) {
    const k = h.text.toLowerCase();
    if (dup.has(k)) { issues.push(`duplicate H2 "${h.text}"`); break; }
    dup.add(k);
  }

  // Intro paragraph before the first heading.
  const introEnd = heads.length ? heads[0].start : html.length;
  if (words(html.slice(0, introEnd)) < 40) issues.push("needs an introduction paragraph (about 100 words) before the first heading");

  // Thin sections.
  const stops = heads.filter((h) => h.level <= 2);
  for (let i = 0; i < h2s.length; i++) {
    const h = h2s[i];
    if (/key takeaways|conclusion|summary|when to (see|seek)/i.test(h.text)) continue; // short by design
    const next = stops.find((s) => s.start > h.start);
    const body = html.slice(h.end, next ? next.start : html.length);
    if (words(body) < minSection) { issues.push(`section "${h.text}" is too thin (under ${minSection} words)`); break; }
  }

  return { ok: issues.length === 0, issues, h2: h2s.length, h3: h3s.length };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";
}

/** Add id anchors to H2/H3 and an "In this article" list before the first H2. Idempotent. */
export function addHeadingAnchorsAndToc(html: string): string {
  if (html.includes('class="cf-toc"')) return html;
  const used = new Set<string>();
  const toc: { id: string; label: string }[] = [];

  const withIds = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, level: string, attrs: string, inner: string) => {
    const label = text(inner);
    if (!label) return full;
    const existing = /\sid=["']([^"']+)["']/i.exec(attrs);
    let id = existing ? existing[1] : slug(label);
    if (!existing) {
      let n = 2; const base = id;
      while (used.has(id)) id = `${base}-${n++}`;
    }
    used.add(id);
    if (level === "2") toc.push({ id, label });
    return existing ? full : `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });

  if (toc.length < 4) return withIds;
  const list =
    `<div class="cf-toc"><p><strong>In this article</strong></p><ul>` +
    toc.map((t) => `<li><a href="#${t.id}">${t.label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</a></li>`).join("") +
    `</ul></div>\n`;
  const firstH2 = withIds.search(/<h2[\s>]/i);
  return firstH2 < 0 ? withIds : `${withIds.slice(0, firstH2)}${list}${withIds.slice(firstH2)}`;
}
