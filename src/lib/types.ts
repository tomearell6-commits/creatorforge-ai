/** Shared domain types mirroring the Supabase schema (see supabase/schema.sql). */

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: string;
  credits: number;
  created_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  idea: string | null;
  status: "draft" | "generating" | "ready";
  created_at: string;
  updated_at: string;
};

export type GeneratedScript = {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  model: string | null;
  tokens_used: number;
  created_at: string;
};

// ---- Phase 3: media ----

export type AssetType = "image" | "audio" | "video" | "thumbnail" | "subtitle";

export type Scene = {
  id: string;
  project_id: string | null;
  user_id: string | null;
  script_id: string;
  position: number;
  title: string | null;
  text: string | null; // narration
  visual_description: string | null;
  image_prompt: string | null;
  video_prompt: string | null;
  camera_direction: string | null;
  transition: string | null;
  duration: number;
  image_url: string | null;
  video_url: string | null;
  voice_url: string | null;
  created_at: string;
};

export type Asset = {
  id: string;
  user_id: string;
  project_id: string | null;
  type: AssetType;
  name: string;
  url: string | null;
  mime_type: string | null;
  size_bytes: number;
  provider: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Voiceover = {
  id: string;
  user_id: string;
  project_id: string | null;
  scene_id: string | null;
  asset_id: string | null;
  provider: string;
  voice_id: string | null;
  language: string | null;
  accent: string | null;
  speed: number;
  pitch: number;
  text: string;
  audio_url: string | null;
  duration: number;
  status: string;
  created_at: string;
};

export type Thumbnail = {
  id: string;
  user_id: string;
  project_id: string | null;
  asset_id: string | null;
  title: string | null;
  style: string;
  prompt: string | null;
  image_url: string | null;
  width: number;
  height: number;
  status: string;
  created_at: string;
};

export type Subtitle = {
  id: string;
  user_id: string;
  project_id: string | null;
  asset_id: string | null;
  format: "srt" | "vtt";
  content: string;
  language: string;
  created_at: string;
};

export type RenderJob = {
  id: string;
  user_id: string;
  project_id: string | null;
  status: "queued" | "processing" | "done" | "failed";
  progress: number;
  estimated_seconds: number;
  logs: string;
  error: string | null;
  output_url: string | null;
  provider_job_id: string | null;
  created_at: string;
  updated_at: string;
};

// =====================================================================
// Phase 6: publishing, analytics, automation & teams
// =====================================================================

export type SocialPlatform =
  | "youtube" | "tiktok" | "instagram" | "facebook" | "linkedin" | "x" | "pinterest";

export type SocialAccount = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  platform: SocialPlatform;
  account_name: string | null;
  account_handle: string | null;
  external_id: string | null;
  scope: string | null;
  status: "connected" | "expired" | "revoked";
  expires_at: string | null;
  last_synced_at: string | null;
  connected_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PublishMode = "now" | "schedule" | "draft";
export type PublishStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";
export type Visibility = "public" | "unlisted" | "private";

export type PublishJob = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  project_id: string | null;
  asset_id: string | null;
  video_url: string | null;
  title: string;
  description: string;
  hashtags: string[];
  tags: string[];
  thumbnail_url: string | null;
  playlist: string | null;
  category: string | null;
  visibility: Visibility;
  mode: PublishMode;
  status: PublishStatus;
  scheduled_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ScheduledPost = {
  id: string;
  user_id: string;
  publish_job_id: string;
  social_account_id: string | null;
  platform: SocialPlatform;
  scheduled_at: string;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
};

export type PublishHistory = {
  id: string;
  user_id: string;
  publish_job_id: string | null;
  scheduled_post_id: string | null;
  platform: SocialPlatform;
  status: "published" | "failed";
  external_post_id: string | null;
  external_url: string | null;
  error: string | null;
  published_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AnalyticsEventType =
  | "video_created" | "video_published" | "view" | "engagement"
  | "credits_consumed" | "render" | "storage";

export type AnalyticsEvent = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  project_id: string | null;
  event_type: AnalyticsEventType;
  platform: string | null;
  value: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NotificationType =
  | "render_complete" | "publish_success" | "publish_failed"
  | "credits_low" | "subscription_renewed" | "storage_full";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AutomationTrigger =
  | "render_complete" | "publish_success" | "credits_low" | "project_completed";
export type AutomationAction = "schedule_publish" | "notify" | "warn" | "archive";

export type AutomationRule = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  trigger: AutomationTrigger;
  conditions: Record<string, unknown>;
  action: AutomationAction;
  action_config: Record<string, unknown>;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: WorkspaceRole;
  status: "invited" | "active";
  created_at: string;
};

export type ActivityLog = {
  id: string;
  workspace_id: string | null;
  user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

// =====================================================================
// Phase 7: enterprise, admin, affiliate/referral, API, support, audit
// =====================================================================

export type AdminRole = "super_admin" | "admin" | "support";
export type AdminUser = { id: string; user_id: string; role: AdminRole; created_at: string };

export type Referral = {
  id: string;
  referrer_id: string;
  referred_user_id: string | null;
  code: string;
  status: "pending" | "converted";
  reward_credits: number;
  created_at: string;
};

export type ReferralReward = {
  id: string;
  user_id: string;
  referral_id: string | null;
  type: "credits" | "cash";
  amount: number;
  status: "pending" | "granted" | "paid";
  created_at: string;
};

export type AffiliateAccount = {
  id: string;
  user_id: string;
  code: string;
  status: "pending" | "active" | "suspended";
  commission_rate: number;
  payout_method: string | null;
  balance: number;
  created_at: string;
};

export type AffiliateCommission = {
  id: string;
  affiliate_id: string;
  referred_user_id: string | null;
  amount: number;
  status: "pending" | "approved" | "paid";
  source: string | null;
  created_at: string;
};

export type ApiKey = {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  request_count: number;
  last_used_at: string | null;
  revoked: boolean;
  created_at: string;
};

export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  user_id: string;
  is_staff: boolean;
  body: string;
  attachments: unknown[];
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PlatformNotification = {
  id: string;
  audience: "all" | "admins" | "user";
  user_id: string | null;
  title: string;
  body: string | null;
  level: "info" | "warning" | "critical";
  created_at: string;
};

export type BillingEvent = {
  id: string;
  user_id: string | null;
  type: "payment" | "refund" | "renewal" | "chargeback";
  amount: number;
  currency: string;
  provider: string | null;
  provider_ref: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type FeatureFlag = { key: string; enabled: boolean; description: string | null; rollout: Record<string, unknown>; updated_at: string };

export type WhiteLabelConfig = { brandName: string; brandColor: string; logoUrl: string | null; customDomain?: string | null; emailFrom?: string | null };
