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
  created_at: string;
  updated_at: string;
};
