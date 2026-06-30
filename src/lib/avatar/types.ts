/**
 * Modular AI avatar (talking-presenter) video provider interface.
 * The tutorial generator depends only on this interface; swap providers with
 * AVATAR_PROVIDER. Generation is async — create returns a job id you poll.
 */
export type AvatarCreateInput = {
  /** The narration the avatar speaks. */
  script: string;
  /** Provider avatar id (defaults via env). */
  avatarId?: string;
  /** Provider voice id (defaults via env). */
  voiceId?: string;
};

export type AvatarJob = { provider: string; jobId: string };

export type AvatarStatus = {
  status: "processing" | "completed" | "failed";
  url?: string;
  error?: string;
};

export interface AvatarProvider {
  readonly id: string;
  isConfigured(): boolean;
  createVideo(input: AvatarCreateInput): Promise<AvatarJob>;
  getStatus(jobId: string): Promise<AvatarStatus>;
}
