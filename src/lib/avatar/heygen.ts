/**
 * HeyGen talking-avatar provider (v2 generate + v1 status).
 * Env: HEYGEN_API_KEY, optional HEYGEN_AVATAR_ID, HEYGEN_VOICE_ID.
 * Docs: https://docs.heygen.com/
 */
import type { AvatarProvider, AvatarCreateInput, AvatarJob, AvatarStatus } from "./types";
import { fetchWithTimeout } from "@/lib/http";

const API = "https://api.heygen.com";

export const heygenProvider: AvatarProvider = {
  id: "heygen",
  isConfigured() { return !!process.env.HEYGEN_API_KEY; },

  async createVideo(input: AvatarCreateInput): Promise<AvatarJob> {
    const key = process.env.HEYGEN_API_KEY;
    if (!key) throw new Error("HEYGEN_API_KEY is not set");
    const res = await fetchWithTimeout(`${API}/v2/video/generate`, {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        video_inputs: [{
          character: { type: "avatar", avatar_id: input.avatarId || process.env.HEYGEN_AVATAR_ID || "Daisy-inskirt-20220818", avatar_style: "normal" },
          voice: { type: "text", input_text: input.script, voice_id: input.voiceId || process.env.HEYGEN_VOICE_ID || "1bd001e7e50f421d891986aad5158bc8" },
        }],
        dimension: { width: 1280, height: 720 },
      }),
    }, 30_000);
    const json = await res.json();
    const id = json?.data?.video_id;
    if (!res.ok || !id) throw new Error(`HeyGen generate failed: ${res.status} ${JSON.stringify(json)}`);
    return { provider: "heygen", jobId: id };
  },

  async getStatus(jobId: string): Promise<AvatarStatus> {
    const key = process.env.HEYGEN_API_KEY!;
    const res = await fetchWithTimeout(`${API}/v1/video_status.get?video_id=${encodeURIComponent(jobId)}`, { headers: { "X-Api-Key": key } }, 30_000);
    const json = await res.json();
    const s = json?.data?.status;
    if (s === "completed") return { status: "completed", url: json.data.video_url };
    if (s === "failed") return { status: "failed", error: json?.data?.error || "HeyGen render failed" };
    return { status: "processing" };
  },
};
