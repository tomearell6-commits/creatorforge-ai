/**
 * Tutorial Center configuration: the 7-category taxonomy (mirrors the DB
 * seeds), the demo-script standards used by the admin generator, and shared
 * types. Tutorial DATA lives in the tutorials table — this file only holds
 * structure and standards.
 */

export const TUTORIAL_CATEGORIES = [
  { id: "getting-started", name: "Getting Started" },
  { id: "account-security", name: "Account & Security" },
  { id: "create", name: "Create" },
  { id: "grow", name: "Grow" },
  { id: "manage", name: "Manage" },
  { id: "business-operations", name: "Business Operations" },
  { id: "admin-infrastructure", name: "Admin & Infrastructure" },
] as const;

export type TutorialRecord = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  category: string;
  video_url: string;
  thumbnail_url: string | null;
  duration: string | null;
  level: string | null;
  status?: string;
  target_route?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
};

/**
 * Every generated script follows this structure (enforced as guidance in the
 * admin generator): Welcome → What it does → When to use it → Steps →
 * Safety/billing notes → Final action. Tone: professional, friendly, clear,
 * short, no exaggeration.
 */
export const SCRIPT_TEMPLATE = `1. WELCOME — one friendly sentence.
2. WHAT THIS FEATURE DOES — plain words, one or two sentences.
3. WHEN TO USE IT — the situation where this helps.
4. STEP-BY-STEP — numbered clicks, exactly as the UI reads.
5. SAFETY / BILLING NOTES — credit costs, approvals, anything irreversible.
6. FINAL ACTION — one clear CTA matching the button under the video.`;

/** Mark a tutorial complete when this fraction of it has been watched. */
export const COMPLETE_THRESHOLD = 0.9;
