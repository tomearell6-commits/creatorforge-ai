/**
 * Assemble a book (title page + chapters) into a downloadable document.
 * Native formats: md, txt, html. "doc" is HTML with a Word MIME type (Word opens
 * it). pdf is produced client-side via the browser's print-to-PDF. epub/docx
 * native packaging needs a zip lib (roadmap).
 */
type BookLike = { title: string; subtitle?: string | null; author_name?: string | null };
type ChapterLike = { title: string; content: string; position: number };

function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function mdToHtml(md: string) {
  return md.split(/\n{2,}/).map((p) => {
    const t = p.trim();
    if (t.startsWith("## ")) return `<h2>${esc(t.slice(3))}</h2>`;
    if (t.startsWith("# ")) return `<h1>${esc(t.slice(2))}</h1>`;
    if (/^[-*] /.test(t)) return `<ul>${t.split(/\n/).map((l) => `<li>${esc(l.replace(/^[-*] /, ""))}</li>`).join("")}</ul>`;
    return `<p>${esc(t).replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");
}

export function buildExport(book: BookLike, chapters: ChapterLike[], format: string): { body: string; contentType: string; ext: string } {
  const ordered = [...chapters].sort((a, b) => a.position - b.position);
  const titleLine = `${book.title}${book.subtitle ? ` — ${book.subtitle}` : ""}`;
  const author = book.author_name ? `by ${book.author_name}` : "";

  if (format === "txt") {
    const body = `${titleLine}\n${author}\n\n` + ordered.map((c) => `\n${c.title}\n${"=".repeat(c.title.length)}\n\n${c.content}`).join("\n\n");
    return { body, contentType: "text/plain; charset=utf-8", ext: "txt" };
  }
  if (format === "md") {
    const body = `# ${titleLine}\n\n${author}\n\n` + ordered.map((c) => `\n## ${c.title}\n\n${c.content}`).join("\n\n");
    return { body, contentType: "text/markdown; charset=utf-8", ext: "md" };
  }
  // html / doc / (pdf prints this client-side)
  const inner = `<h1>${esc(titleLine)}</h1>${author ? `<p><em>${esc(author)}</em></p>` : ""}` +
    ordered.map((c) => `<section><h2>${esc(c.title)}</h2>${mdToHtml(c.content)}</section>`).join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(book.title)}</title>
<style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.6}h1{font-size:2rem}h2{margin-top:2.5rem;border-bottom:1px solid #ddd;padding-bottom:.3rem}section{page-break-before:always}</style>
</head><body>${inner}</body></html>`;
  if (format === "doc") return { body: html, contentType: "application/msword", ext: "doc" };
  return { body: html, contentType: "text/html; charset=utf-8", ext: "html" };
}

export const NATIVE_EXPORT_FORMATS = ["txt", "md", "html", "doc"];
