/**
 * Procedural branded tutorial thumbnails — an SVG data URI generated on the
 * fly (1280×720, CreatorsForge design language). Free and automatic: any
 * tutorial without a stored thumbnail_url gets one of these as its poster.
 * Admins can replace them with AI-generated images via the admin panel.
 */

const BRAND = "#84cc16";
const INK = "#0f1b0a";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Wrap a title into at most `maxLines` lines of ~`maxChars` characters. */
export function wrapTitle(title: string, maxChars = 20, maxLines = 3): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, maxChars - 1) + "…";
  }
  return lines;
}

export function tutorialThumbSvg(title: string, subtitle: string): string {
  const lines = wrapTitle(title);
  const titleSpans = lines
    .map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : 78}">${esc(l)}</tspan>`)
    .join("");
  const titleY = 330 - (lines.length - 1) * 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#ffffff"/>
  <rect width="1280" height="12" fill="${BRAND}"/>
  <circle cx="1130" cy="560" r="260" fill="${BRAND}" opacity="0.12"/>
  <circle cx="1180" cy="620" r="160" fill="${BRAND}" opacity="0.18"/>
  <text x="80" y="120" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="800" fill="${INK}">CreatorsForge<tspan fill="${BRAND}">.io</tspan></text>
  <text x="80" y="${titleY}" font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="800" fill="${INK}">${titleSpans}</text>
  <text x="80" y="${titleY + (lines.length - 1) * 78 + 70}" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#6b7280">${esc(subtitle)}</text>
  <g transform="translate(80, 580)">
    <rect width="220" height="64" rx="14" fill="${BRAND}"/>
    <path d="M 88 16 L 88 48 L 116 32 Z" fill="${INK}"/>
    <text x="128" y="42" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="${INK}">Watch</text>
  </g>
</svg>`;
}

/** Data URI usable directly as <video poster> / <img src>. */
export function tutorialThumbDataUri(title: string, subtitle: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(tutorialThumbSvg(title, subtitle))}`;
}
