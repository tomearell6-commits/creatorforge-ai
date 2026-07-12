/**
 * Unified User Workflow Standard — the six-stage journey every project follows:
 *
 *   Create → Review → Connect → Publish → Promote → Analyze
 *
 * This config is the single source of truth for the workflow: which steps apply
 * to each content type, which are required vs optional, the create sub-tasks,
 * review requirements, promotion options, and analytics sources. It COMPOSES
 * with publishingCapabilities.ts (destinations / ad platforms / credits live
 * there) rather than duplicating it.
 */
import {
  getCapability, PUBLISH_DESTINATIONS,
  type ContentTypeId,
} from "./publishingCapabilities";

export type WorkflowStepId = "create" | "review" | "connect" | "publish" | "promote" | "analyze";

export const WORKFLOW_STEPS: { id: WorkflowStepId; label: string; verb: string }[] = [
  { id: "create", label: "Create", verb: "Create your content" },
  { id: "review", label: "Review", verb: "Review your content" },
  { id: "connect", label: "Connect", verb: "Connect your account" },
  { id: "publish", label: "Publish", verb: "Choose where to publish" },
  { id: "promote", label: "Promote", verb: "Create a promotion" },
  { id: "analyze", label: "Analyze", verb: "View performance" },
];

/** Per-step status vocabularies (shared, from the spec). */
export const STEP_STATUSES: Record<WorkflowStepId, string[]> = {
  create: ["not_started", "draft", "generating", "generation_failed", "ready_for_review"],
  review: ["awaiting_review", "changes_requested", "approved", "rejected"],
  connect: ["not_connected", "connecting", "connected", "expired", "permission_required", "connection_failed"],
  publish: ["ready_to_publish", "scheduled", "publishing", "published", "failed", "cancelled"],
  promote: ["not_started", "draft_promotion", "awaiting_approval", "scheduled", "active", "completed", "failed"],
  analyze: ["collecting_data", "report_ready", "limited_data", "provider_unavailable"],
};

export interface WorkflowStepDef {
  id: WorkflowStepId;
  label: string;
  required: boolean;
  /** Plain-language guidance shown under the step. */
  hint: string;
}

export interface AnalyticsSource {
  id: string;
  label: string;
  /** true = real data available today; false = needs a connected/approved provider. */
  live: boolean;
}

export interface WorkflowCapability {
  contentType: ContentTypeId;
  label: string;
  steps: WorkflowStepDef[];
  createTasks: string[];
  reviewRequirements: string[];
  promotionOptions: string[];
  analyticsSources: AnalyticsSource[];
  estimatedCredits: number;
}

// Analytics sources we can serve TODAY (from our own data) vs. provider-gated.
const OWN_ANALYTICS: AnalyticsSource[] = [
  { id: "publishing", label: "Publishing success", live: true },
  { id: "credits", label: "Credits spent", live: true },
];
const SOCIAL_ANALYTICS: AnalyticsSource[] = [
  { id: "views", label: "Views", live: false },
  { id: "reach", label: "Reach", live: false },
  { id: "engagement", label: "Engagement", live: false },
];
const AD_ANALYTICS: AnalyticsSource[] = [
  { id: "impressions", label: "Impressions", live: false },
  { id: "clicks", label: "Clicks", live: false },
  { id: "conversions", label: "Conversions", live: false },
];
const SEO_ANALYTICS: AnalyticsSource[] = [
  { id: "seo_audit", label: "SEO audit", live: true },
  { id: "indexing", label: "Indexing readiness", live: true },
  { id: "traffic", label: "Search traffic", live: false },
];

function step(id: WorkflowStepId, required: boolean, hint: string): WorkflowStepDef {
  return { id, label: WORKFLOW_STEPS.find((s) => s.id === id)!.label, required, hint };
}

/** Default step set: Create + Review required; Connect required only when a live
 *  publish destination exists; Publish/Promote/Analyze optional by default. */
function defaultSteps(contentType: ContentTypeId): WorkflowStepDef[] {
  const cap = getCapability(contentType);
  const hasLivePublish = !!cap && cap.publishDestinations.some((d) => PUBLISH_DESTINATIONS[d]?.live);
  const canPromote = !!cap && cap.adPlatforms.length > 0;
  return [
    step("create", true, "Generate or build your content."),
    step("review", true, "Preview, edit, and approve before anything goes out."),
    step("connect", hasLivePublish, "Connect the account or site you'll publish to."),
    step("publish", true, "Publish now, schedule, or save as a draft."),
    step("promote", canPromote ? false : false, "Optional — create ads, social posts, or an email campaign."),
    step("analyze", false, "See results after publishing."),
  ];
}

// Per-type overrides for create tasks / review / promotion / analytics.
const OVERRIDES: Partial<Record<ContentTypeId, Partial<WorkflowCapability>>> = {
  ai_video: {
    createTasks: ["Generate script", "Build scenes", "Add voiceover", "Add visuals", "Render to MP4"],
    reviewRequirements: ["Preview video", "Check captions", "Check thumbnail", "Review metadata"],
    promotionOptions: ["Create ads", "Short captions", "Email promotion", "Social variations"],
    analyticsSources: [...OWN_ANALYTICS, ...SOCIAL_ANALYTICS, ...AD_ANALYTICS],
  },
  ai_short: {
    createTasks: ["Generate script", "Build scenes", "Add voiceover", "Render short"],
    reviewRequirements: ["Preview short", "Check caption", "Check thumbnail"],
    promotionOptions: ["Create ads", "Cross-post variations"],
    analyticsSources: [...OWN_ANALYTICS, ...SOCIAL_ANALYTICS],
  },
  seo_article: {
    createTasks: ["Keyword brief", "Outline", "Write article", "Metadata", "Image prompts"],
    reviewRequirements: ["Edit article", "SEO title & description", "Headings & links", "Featured image"],
    promotionOptions: ["Social posts", "Email summary", "Ad campaign"],
    analyticsSources: [...OWN_ANALYTICS, ...SEO_ANALYTICS, ...AD_ANALYTICS],
  },
  blog_article: {
    createTasks: ["Outline", "Write article", "Metadata", "Image prompts"],
    reviewRequirements: ["Edit article", "Meta title & description", "Featured image"],
    promotionOptions: ["Social posts", "Email summary", "Ad campaign"],
    analyticsSources: [...OWN_ANALYTICS, ...SEO_ANALYTICS],
  },
  book: {
    createTasks: ["Concept", "Outline", "Chapters", "Cover", "Illustrations"],
    reviewRequirements: ["Edit manuscript", "Review cover", "Check formatting", "Export settings"],
    promotionOptions: ["Launch campaign", "Ads", "Social posts", "Landing page", "Email sequence"],
    analyticsSources: [...OWN_ANALYTICS, ...SOCIAL_ANALYTICS, ...AD_ANALYTICS],
  },
  ebook: {
    createTasks: ["Concept", "Outline", "Chapters", "Cover"],
    reviewRequirements: ["Edit manuscript", "Review cover", "Export settings"],
    promotionOptions: ["Launch campaign", "Ads", "Social posts", "Email sequence"],
    analyticsSources: [...OWN_ANALYTICS, ...SOCIAL_ANALYTICS, ...AD_ANALYTICS],
  },
  design: {
    createTasks: ["Choose template", "Generate design", "Edit layers"],
    reviewRequirements: ["Preview dimensions", "Check text & branding", "Image quality", "Export format"],
    promotionOptions: ["Create variations", "Campaign assets", "Paid ads"],
    analyticsSources: [...OWN_ANALYTICS, ...SOCIAL_ANALYTICS, ...AD_ANALYTICS],
  },
  image: {
    createTasks: ["Prompt", "Generate image", "Refine"],
    reviewRequirements: ["Preview", "Check dimensions", "Export format"],
    promotionOptions: ["Create variations", "Paid ads"],
    analyticsSources: [...OWN_ANALYTICS, ...SOCIAL_ANALYTICS],
  },
  advertisement: {
    createTasks: ["Choose platform", "Generate ad copy", "Generate creative"],
    reviewRequirements: ["Review copy", "Check creative", "Compliance check"],
    promotionOptions: ["Add to campaign", "Platform variations"],
    analyticsSources: [...OWN_ANALYTICS, ...AD_ANALYTICS],
  },
  website: {
    createTasks: ["Generate structure", "Page copy", "Assets", "Wireframes", "Project plan"],
    reviewRequirements: ["Inspect pages", "Responsiveness", "SEO", "Technical requirements"],
    promotionOptions: ["Launch campaign", "Ads", "Social announcement", "Email sequence", "SEO content"],
    analyticsSources: [...OWN_ANALYTICS, ...SEO_ANALYTICS, ...AD_ANALYTICS],
  },
  app: {
    createTasks: ["Generate structure", "Feature plan", "User flow", "Project plan"],
    reviewRequirements: ["Inspect plan", "Technical requirements", "Roadmap"],
    promotionOptions: ["Launch campaign", "Ads", "Social announcement", "Email sequence"],
    analyticsSources: [...OWN_ANALYTICS, ...AD_ANALYTICS],
  },
  email_campaign: {
    createTasks: ["Choose template", "Write copy", "Add assets"],
    reviewRequirements: ["Preview email", "Subject & preheader", "Links"],
    promotionOptions: ["Cross-post announcement"],
    analyticsSources: [...OWN_ANALYTICS, { id: "opens", label: "Opens", live: false }, { id: "clicks", label: "Clicks", live: false }],
  },
  social_video: {
    createTasks: ["Generate script", "Build scenes", "Add voiceover", "Render"],
    reviewRequirements: ["Preview", "Check caption", "Check thumbnail"],
    promotionOptions: ["Create ads", "Cross-post variations"],
    analyticsSources: [...OWN_ANALYTICS, ...SOCIAL_ANALYTICS],
  },
  long_form_video: {
    createTasks: ["Generate script", "Build scenes", "Add voiceover", "Render"],
    reviewRequirements: ["Preview", "Chapters", "Thumbnail", "Metadata"],
    promotionOptions: ["Create ads", "Short clips", "Email promotion"],
    analyticsSources: [...OWN_ANALYTICS, ...SOCIAL_ANALYTICS, ...AD_ANALYTICS],
  },
  podcast: {
    createTasks: ["Script", "Record/voiceover", "Render"],
    reviewRequirements: ["Preview", "Title & description", "Thumbnail"],
    promotionOptions: ["Create ads", "Social clips"],
    analyticsSources: [...OWN_ANALYTICS, ...SOCIAL_ANALYTICS],
  },
  business_document: {
    createTasks: ["Choose type", "Generate document", "Edit"],
    reviewRequirements: ["Preview", "Check formatting"],
    promotionOptions: ["Share announcement"],
    analyticsSources: [...OWN_ANALYTICS],
  },
  real_estate: {
    createTasks: ["Project details", "Generate concept", "Edit"],
    reviewRequirements: ["Preview", "Check details", "Export format"],
    promotionOptions: ["Property ads", "Social posts", "Listing campaign"],
    analyticsSources: [...OWN_ANALYTICS, ...SOCIAL_ANALYTICS, ...AD_ANALYTICS],
  },
  landing_page: {
    createTasks: ["Generate structure", "Copy", "Assets"],
    reviewRequirements: ["Preview", "Copy", "SEO"],
    promotionOptions: ["Ads", "Social announcement", "Email"],
    analyticsSources: [...OWN_ANALYTICS, ...SEO_ANALYTICS, ...AD_ANALYTICS],
  },
};

export function getWorkflow(contentType: ContentTypeId): WorkflowCapability | null {
  const cap = getCapability(contentType);
  if (!cap) return null;
  const o = OVERRIDES[contentType] ?? {};
  return {
    contentType,
    label: cap.label,
    steps: o.steps ?? defaultSteps(contentType),
    createTasks: o.createTasks ?? ["Describe your idea", "Generate", "Edit"],
    reviewRequirements: o.reviewRequirements ?? ["Preview", "Edit", "Approve"],
    promotionOptions: o.promotionOptions ?? ["Social posts", "Ad campaign"],
    analyticsSources: o.analyticsSources ?? [...OWN_ANALYTICS],
    estimatedCredits: Object.values(cap.creditEstimate).reduce((a, b) => a + (b ?? 0), 0),
  };
}

export function requiredSteps(contentType: ContentTypeId): WorkflowStepId[] {
  return (getWorkflow(contentType)?.steps ?? []).filter((s) => s.required).map((s) => s.id);
}

/** The next step to act on given completed steps. */
export function nextWorkflowStep(contentType: ContentTypeId, completed: WorkflowStepId[]): WorkflowStepId | null {
  const wf = getWorkflow(contentType);
  if (!wf) return null;
  for (const s of wf.steps) if (!completed.includes(s.id)) return s.id;
  return null;
}

/** Human next-action label, e.g. "Approve video and connect YouTube". */
export function nextActionLabel(contentType: ContentTypeId, completed: WorkflowStepId[]): string {
  const next = nextWorkflowStep(contentType, completed);
  if (!next) return "View performance";
  return WORKFLOW_STEPS.find((s) => s.id === next)?.verb ?? "Continue";
}
