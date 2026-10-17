/**
 * Assemble the final HTML published to a client site. The writer returns the FAQ
 * separately from the article body, so without this step WordPress would never show
 * it. The FAQ is inserted before the medical disclaimer (when present) so the
 * disclaimer stays the last thing on the page.
 */
import { MEDICAL_DISCLAIMER_MARKER } from "./health";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function faqToHtml(faq: { q: string; a: string }[]): string {
  const items = faq.filter((f) => f?.q?.trim() && f?.a?.trim());
  if (!items.length) return "";
  return (
    `<h2>Frequently asked questions</h2>\n` +
    items.map((f) => `<h3>${esc(f.q.trim())}</h3>\n<p>${esc(f.a.trim())}</p>`).join("\n")
  );
}

/** Insert the FAQ section before the disclaimer (or at the end when there is none). */
export function composeArticleHtml(articleHtml: string, faq: { q: string; a: string }[]): string {
  const faqHtml = faqToHtml(faq);
  if (!faqHtml || /Frequently asked questions/i.test(articleHtml)) return articleHtml; // never add it twice
  const markerAt = articleHtml.indexOf(`<p ${MEDICAL_DISCLAIMER_MARKER}`);
  if (markerAt < 0) return `${articleHtml}\n${faqHtml}`;
  // The disclaimer is preceded by an <hr>; keep that rule attached to it.
  const hrAt = articleHtml.lastIndexOf("<hr>", markerAt);
  const cut = hrAt >= 0 && markerAt - hrAt < 12 ? hrAt : markerAt;
  return `${articleHtml.slice(0, cut)}${faqHtml}\n${articleHtml.slice(cut)}`;
}
