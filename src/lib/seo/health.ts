/**
 * Health / medical content safeguards for the SEO writer.
 *
 * Health is "Your Money or Your Life" content: search engines hold it to a higher
 * standard and wrong advice can hurt readers. These helpers (1) detect health
 * topics, (2) append a standard educational disclaimer in CODE (never relying on
 * the model to remember), and (3) catch the most dangerous kinds of claim so the
 * article is regenerated or refused instead of published.
 */

const HEALTH_TERMS =
  /\b(health|healthcare|medical|medicine|medication|drug|disease|disorder|syndrome|symptom|treatment|therapy|therapeutic|diagnos\w*|clinical|patient|doctor|physician|nutrition|diet|vitamin|supplement|cancer|diabetes|diabetic|cardio\w*|heart|blood pressure|cholesterol|mental health|anxiety|depress\w*|sleep|insomnia|immune|immunity|infection|vaccin\w*|surgery|pregnan\w*|dental|dermatolog\w*|wellness|obesity|hormone|allergy|asthma|arthritis|bacteria\w*|epidemiolog\w*|public health|pharmac\w*|medical research|clinical trial|chronic pain|back pain|pain relief|pain management)\b/i;

/** True when the keyword/topic is about health, medicine or medical research. */
export function isHealthTopic(...texts: (string | null | undefined)[]): boolean {
  const joined = texts.filter(Boolean).join(" ");
  return HEALTH_TERMS.test(joined);
}

export const MEDICAL_DISCLAIMER_MARKER = "data-medical-disclaimer";

const DISCLAIMER_HTML =
  `<hr><p ${MEDICAL_DISCLAIMER_MARKER}="true"><strong>Medical disclaimer:</strong> This article is for general ` +
  `educational and informational purposes only. It is not medical advice, does not create a doctor–patient ` +
  `relationship, and is not a substitute for professional diagnosis or treatment. Health research evolves and ` +
  `guidance can differ between countries, so always speak with a qualified healthcare professional about your ` +
  `own situation. In an emergency, contact your local emergency number or nearest emergency service immediately.</p>`;

/** Append the standard disclaimer once (idempotent). */
export function withMedicalDisclaimer(html: string): string {
  if (html.includes(MEDICAL_DISCLAIMER_MARKER)) return html;
  return `${html}\n${DISCLAIMER_HTML}`;
}

/**
 * Phrases we never publish: guaranteed cures, "miracle" treatments, telling
 * readers to stop medication or skip a doctor. Deliberately narrow so normal
 * educational sentences ("there is currently no cure for…") are not blocked.
 */
const RISKY_PATTERNS: { re: RegExp; why: string }[] = [
  { re: /\bguarantee[sd]?\b[^.]{0,40}\b(cure|heal|treat|work|results?|recovery)\b/i, why: "guarantees a health outcome" },
  { re: /\bmiracle\s+(cure|treatment|remedy|drug|pill)\b/i, why: "calls something a miracle cure" },
  { re: /\b100\s*%\s*(safe|effective|cure|natural cure)\b/i, why: "claims 100% safety or effectiveness" },
  { re: /\b(stop|quit|discontinue)\s+taking\s+(your\s+)?(prescribed\s+)?(medication|medicine|meds|pills)\b/i, why: "tells readers to stop medication" },
  { re: /\binstead\s+of\s+(seeing|visiting|consulting|asking)\s+(a|your)\s+(doctor|physician|gp)\b/i, why: "tells readers to skip a doctor" },
  { re: /\b(will|can)\s+cure\s+(your\s+)?(cancer|diabetes|hiv|aids|depression|anxiety|alzheimer\w*|covid\w*)\b/i, why: "claims to cure a serious disease" },
];

/** Returns a list of reasons the article should not be published (empty = OK). */
export function findRiskyHealthClaims(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, " ");
  return RISKY_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.why);
}

/** Style rules appended to every article-image prompt (health gets extra care). */
export function articleImagePrompt(opts: { subject: string; health: boolean; basePrompt?: string | null }): string {
  const subject = opts.subject.trim();
  const core = (opts.basePrompt || "").trim() || `A high-quality editorial photograph illustrating: ${subject}`;
  const health = opts.health
    ? " For health topics show neutral, educational subjects (healthy food, laboratory glassware, an anatomical model, " +
      "a person walking outdoors, a calm clinical environment with no identifiable patient). Never depict a specific " +
      "real person as a doctor or patient, before-and-after results, injuries, pills being promoted, or anything " +
      "that implies a guaranteed medical outcome."
    : "";
  return (
    `${core}\n\nStyle: realistic, natural lighting, professional editorial photography, sharp focus, 3:2 landscape ` +
    `composition, no text, no captions, no watermarks, no logos, no brand names, no recognizable real people.` +
    health
  );
}
