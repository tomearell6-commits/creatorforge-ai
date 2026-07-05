/**
 * AI Business Operations Manager — module configuration.
 * The safety contract lives here: automation modes, what Autopilot may NEVER
 * do without explicit approval, inquiry categories that are always sensitive,
 * document types, and credit pricing.
 */

export const BUSINESS_NAV = [
  { href: "/dashboard/business", label: "Executive Dashboard" },
  { href: "/dashboard/business/profile", label: "Company Profile" },
  { href: "/dashboard/business/products", label: "Product Catalogue" },
  { href: "/dashboard/business/marketing", label: "Marketing Center" },
  { href: "/dashboard/business/inquiries", label: "Inquiry Center" },
  { href: "/dashboard/business/documents", label: "Documents" },
  { href: "/dashboard/business/knowledge", label: "Knowledge Base" },
  { href: "/dashboard/business/reports", label: "Reports" },
  { href: "/dashboard/business/health", label: "Health Score" },
  { href: "/dashboard/business/settings", label: "Settings" },
];

export type AutomationMode = "manual" | "assisted" | "autopilot";

export const AUTOMATION_MODES: { id: AutomationMode; label: string; description: string }[] = [
  { id: "manual", label: "Manual", description: "AI prepares work. You approve every action before anything happens." },
  { id: "assisted", label: "Assisted", description: "AI prepares work and notifies you — approve with one click." },
  { id: "autopilot", label: "Autopilot", description: "After explicit opt-in, AI may publish APPROVED content, schedule APPROVED campaigns and generate reports. High-risk actions always require you." },
];

/** Actions Autopilot may NEVER take without explicit per-action user approval. */
export const AUTOPILOT_FORBIDDEN = [
  "Negotiate pricing",
  "Approve refunds",
  "Accept contracts",
  "Handle legal matters",
  "Handle disputes",
  "Change billing or subscriptions",
  "Delete data",
  "Send replies to customers",
] as const;

export const INQUIRY_CATEGORIES = [
  { id: "sales", label: "Sales" },
  { id: "support", label: "Support" },
  { id: "general", label: "General" },
  { id: "partnership", label: "Partnership" },
  { id: "quotation", label: "Quotation Request" },
  { id: "appointment", label: "Appointment" },
] as const;

/** Categories the AI must always flag sensitive (drafts allowed, extra care shown). */
export const SENSITIVE_INQUIRY_KEYWORDS = [
  "refund", "legal", "lawyer", "lawsuit", "dispute", "complaint", "chargeback",
  "cancel contract", "gdpr", "data deletion", "court",
];

export const DOCUMENT_TYPES = [
  { id: "quotation", label: "Quotation", numbered: true },
  { id: "invoice", label: "Invoice", numbered: true },
  { id: "proposal", label: "Proposal", numbered: true },
  { id: "contract_template", label: "Contract (template)", numbered: false },
  { id: "purchase_order", label: "Purchase Order", numbered: true },
  { id: "capability_statement", label: "Capability Statement", numbered: false },
  { id: "company_profile", label: "Company Profile", numbered: false },
  { id: "presentation", label: "Presentation Outline", numbered: false },
  { id: "report", label: "Business Report", numbered: false },
  { id: "certificate", label: "Certificate", numbered: false },
] as const;

export type DocumentTypeId = (typeof DOCUMENT_TYPES)[number]["id"];

export const KNOWLEDGE_KINDS = [
  { id: "document", label: "Company Document" },
  { id: "faq", label: "FAQ" },
  { id: "policy", label: "Policy" },
  { id: "brand_guide", label: "Brand Guidelines" },
  { id: "catalogue", label: "Product Catalogue" },
  { id: "sales", label: "Sales Document" },
  { id: "pricing", label: "Pricing" },
  { id: "training", label: "Training Manual" },
  { id: "marketing", label: "Marketing Material" },
] as const;

/** Credit pricing (charged only when real AI ran, after success — house rule). */
export const BUSINESS_CREDIT_COSTS = {
  profileOptimize: 5,
  productPack: 8,
  inquiryTriage: 5,      // per batch of up to 25
  inquiryDraft: 2,
  documentGenerate: 5,
  businessReport: 10,
} as const;

export const BUSINESS_CREDIT_REASONS = {
  profileOptimize: "BIZ_PROFILE_OPTIMIZE",
  productPack: "BIZ_PRODUCT_PACK",
  inquiryTriage: "BIZ_INQUIRY_TRIAGE",
  inquiryDraft: "BIZ_INQUIRY_DRAFT",
  documentGenerate: "BIZ_DOCUMENT",
  businessReport: "BIZ_REPORT",
} as const;

export const REPORT_TYPES = [
  { id: "weekly", label: "Weekly Summary" },
  { id: "monthly", label: "Monthly Business Report" },
  { id: "marketing", label: "Marketing Report" },
  { id: "content", label: "Content Report" },
  { id: "inquiries", label: "Inquiry Report" },
  { id: "credits", label: "Credit Usage Report" },
  { id: "growth", label: "Business Growth Report" },
] as const;
