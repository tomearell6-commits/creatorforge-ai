/**
 * AI Email Assistant — safety rules, permission modes, categories, credits.
 * Pure constants + functions (unit-tested). The send route enforces these
 * SERVER-SIDE; the UI mirrors them for clarity.
 */

export type PermissionMode = "read_summarize" | "draft_assistant" | "assisted_automation";

export const PERMISSION_MODES: { id: PermissionMode; label: string; description: string }[] = [
  { id: "read_summarize", label: "Read & Summarize", description: "AI reads and summarizes emails only. No drafts, no sending." },
  { id: "draft_assistant", label: "Draft Assistant (default)", description: "AI reads emails and prepares draft replies. Nothing is ever sent without you." },
  { id: "assisted_automation", label: "Assisted Automation", description: "AI drafts replies and may send ONLY for rules you approve — never for sensitive topics." },
];

export const DEFAULT_PERMISSION_MODE: PermissionMode = "draft_assistant";

export type EmailCategory =
  | "urgent" | "needs_reply" | "waiting" | "support" | "sales_lead" | "billing"
  | "partnership" | "newsletter" | "low_priority" | "personal" | "follow_up";

export const EMAIL_CATEGORIES: { id: EmailCategory; label: string }[] = [
  { id: "urgent", label: "Urgent" },
  { id: "needs_reply", label: "Needs Reply" },
  { id: "waiting", label: "Waiting for User" },
  { id: "support", label: "Customer Support" },
  { id: "sales_lead", label: "Sales Lead" },
  { id: "billing", label: "Invoice / Billing" },
  { id: "partnership", label: "Partnership" },
  { id: "newsletter", label: "Newsletter" },
  { id: "low_priority", label: "Spam / Low Priority" },
  { id: "personal", label: "Personal" },
  { id: "follow_up", label: "Follow-Up Required" },
];

export type EmailPriority = "critical" | "high" | "medium" | "low";
export const EMAIL_PRIORITIES: EmailPriority[] = ["critical", "high", "medium", "low"];

export type DraftTone = "professional" | "friendly" | "direct" | "apologetic" | "sales" | "support";
export const DRAFT_TONES: { id: DraftTone; label: string }[] = [
  { id: "professional", label: "Professional" },
  { id: "friendly", label: "Friendly" },
  { id: "direct", label: "Direct" },
  { id: "apologetic", label: "Apologetic" },
  { id: "sales", label: "Sales-focused" },
  { id: "support", label: "Support-focused" },
];

/** Topics for which AUTOMATIC sending is always blocked — manual approval only. */
export const SENSITIVE_KEYWORDS: string[] = [
  "legal", "lawyer", "attorney", "lawsuit", "court", "subpoena", "contract dispute",
  "invoice", "payment", "billing", "refund", "chargeback", "bank", "wire transfer", "tax",
  "password", "verification code", "2fa", "security alert", "account compromised", "login attempt",
  "medical", "diagnosis", "prescription", "health record",
  "government", "irs", "visa", "immigration", "passport",
  "complaint", "dispute", "escalation", "cancel my account", "unsubscribe me",
  "confidential", "nda",
];

/** Categories that are always manual-approval regardless of keywords. */
export const SENSITIVE_CATEGORIES: EmailCategory[] = ["billing"];

/**
 * True when an email must NEVER be auto-sent to (legal/financial/security/
 * medical/government/disputes/refunds/complaints/sensitive topics).
 */
export function isSensitiveEmail(input: { subject?: string | null; body?: string | null; category?: string | null }): boolean {
  if (input.category && SENSITIVE_CATEGORIES.includes(input.category as EmailCategory)) return true;
  const text = `${input.subject ?? ""} ${input.body ?? ""}`.toLowerCase();
  return SENSITIVE_KEYWORDS.some((k) => text.includes(k));
}

/** Whether an account's mode permits a given capability. */
export function modeAllows(mode: PermissionMode, capability: "read" | "draft" | "auto_send"): boolean {
  if (capability === "read") return true;
  if (capability === "draft") return mode !== "read_summarize";
  return mode === "assisted_automation";
}

/**
 * Server-side send gate. Auto-send (via automation rules) requires
 * assisted_automation mode AND a non-sensitive email AND an active matching
 * rule. Manual sends require explicit user approval and any drafting mode.
 */
export function canSend(opts: {
  mode: PermissionMode;
  manualApproval: boolean;
  sensitive: boolean;
}): { allowed: boolean; reason: string } {
  if (opts.mode === "read_summarize") return { allowed: false, reason: "Account is in Read & Summarize mode — sending is disabled." };
  if (opts.manualApproval) return { allowed: true, reason: "User-approved send." };
  if (!modeAllows(opts.mode, "auto_send")) return { allowed: false, reason: "Automatic sending requires Assisted Automation mode." };
  if (opts.sensitive) return { allowed: false, reason: "Sensitive topic (legal/billing/security/medical/dispute) — manual approval required." };
  return { allowed: true, reason: "Safe automation rule send." };
}

// ---- Credits ----------------------------------------------------------------
export const EMAIL_CREDIT_COSTS = {
  scanPer25: 5,       // inbox scan + classification, per 25 emails
  draftReply: 2,      // one AI draft reply
  dailySummary: 5,    // daily attention summary
  fullReport: 10,     // full inbox report
  ruleExecution: 2,   // automation rule run that produces a draft
} as const;

export const EMAIL_CREDIT_REASONS = {
  scan: "EMAIL_SCAN",
  draft: "EMAIL_DRAFT_REPLY",
  summary: "EMAIL_DAILY_SUMMARY",
  report: "EMAIL_FULL_REPORT",
  rule: "EMAIL_RULE_EXECUTION",
} as const;

export function estimateScanCredits(messageCount: number): number {
  return Math.max(EMAIL_CREDIT_COSTS.scanPer25, Math.ceil(messageCount / 25) * EMAIL_CREDIT_COSTS.scanPer25);
}
