/**
 * Provider interfaces for the media generation engine.
 *
 * These define the contract every voice / image / video backend must satisfy,
 * so additional providers (ElevenLabs, OpenAI, Replicate, etc.) can be dropped
 * in later without touching the API routes or UI. See providers/ for the
 * placeholder implementations and the env-driven registry.
 */

// ---- Voice ----
export type VoiceSynthesisInput = {
  text: string;
  voiceId?: string;
  language?: string;
  accent?: string;
  speed: number; // 0.5 – 2.0
  pitch: number; // 0.5 – 2.0
  preview?: boolean; // short sample, not the full narration
};

export type VoiceSynthesisResult = {
  data: Uint8Array; // raw audio bytes (uploaded to Storage; data-URI'd for preview)
  contentType: string;
  durationSeconds: number;
  provider: string;
};

export interface VoiceProvider {
  id: string;
  name: string;
  synthesize(input: VoiceSynthesisInput): Promise<VoiceSynthesisResult>;
}

// ---- Image ----
export type ImageGenInput = {
  prompt: string;
  width?: number;
  height?: number;
  seed?: string;
};

export type ImageGenResult = {
  data: Uint8Array; // raw image bytes (uploaded to Storage by the route)
  contentType: string;
  width: number;
  height: number;
  provider: string;
};

export interface ImageProvider {
  id: string;
  name: string;
  generate(input: ImageGenInput): Promise<ImageGenResult>;
}

// ---- Video ----
export type VideoGenInput = {
  prompt: string;
  durationSeconds?: number;
  seed?: string;
  /** Optional first frame for image-to-video (scene image → consistent clip). */
  imageUrl?: string | null;
};

export type VideoGenResult = {
  url: string | null;
  status: string; // "ready" | "placeholder" | "processing"
  provider: string;
};

export interface VideoProvider {
  id: string;
  name: string;
  generate(input: VideoGenInput): Promise<VideoGenResult>;
}
