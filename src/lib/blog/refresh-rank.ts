/**
 * Which older blog posts are worth refreshing first. Pure and explainable: every point of priority comes
 * with a plain-language reason shown to the owner.
 */
export type RefreshInput = {
  words: number;
  ageDays: number | null;
  impressions?: number | null;
  clicks?: number | null;
  position?: number | null;
  indexed?: boolean | null;
};
export type RefreshVerdict = { priority: number; reasons: string[] };

export const THIN_WORDS = 1200;

export function refreshPriority(p: RefreshInput): RefreshVerdict {
  let priority = 0;
  const reasons: string[] = [];

  if (p.words < THIN_WORDS) {
    priority += p.words < 900 ? 5 : 3;
    reasons.push(`Short: ${p.words.toLocaleString()} words (new articles run 1,500+)`);
  }
  if (p.indexed === false) {
    priority += 2;
    reasons.push("Google has not indexed it");
  }
  if ((p.impressions ?? 0) >= 20 && (p.position ?? 0) > 10) {
    priority += 2;
    reasons.push(`Shown ${p.impressions} times but sits at position ${p.position}`);
  }
  if ((p.ageDays ?? 0) >= 60 && priority > 0) {
    priority += 1;
    reasons.push(`${p.ageDays} days old`);
  }
  return { priority, reasons };
}

export const wordCount = (html: string): number =>
  html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").split(/\s+/).filter(Boolean).length;
