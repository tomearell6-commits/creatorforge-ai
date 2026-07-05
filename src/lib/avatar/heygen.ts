/**
 * HeyGen talking-avatar provider (v2 generate + v1 status).
 * Env: HEYGEN_API_KEY, optional HEYGEN_AVATAR_ID, HEYGEN_VOICE_ID.
 * Docs: https://docs.heygen.com/
 */
import type { AvatarProvider, AvatarCreateInput, AvatarJob, AvatarStatus } from "./types";
import { fetchWithTimeout } from "@/lib/http";

const API = "https://api.heygen.com";

/**
 * HeyGen retires public avatars/voices over time (a hardcoded id caused
 * "RealAvatar ... not found" 500s). Resolve a currently-available avatar and
 * voice from the account's own lists, preferring env overrides when set.
 * The lookups are cached for the process lifetime so only the first render
 * pays the listing cost.
 */
let cachedAvatarId: string | null = null;
let cachedVoiceId: string | null = null;

async function resolveAvatarId(key: string, preferred?: string): Promise<string> {
  if (preferred) return preferred;
  if (cachedAvatarId) return cachedAvatarId;
  const res = await fetchWithTimeout(`${API}/v2/avatars`, { headers: { "X-Api-Key": key } }, 12_000);
  const json = await res.json().catch(() => null);
  const avatars: { avatar_id: string; premium?: boolean }[] = json?.data?.avatars ?? [];
  if (!res.ok || avatars.length === 0) {
    throw new Error("HeyGen: could not list available avatars — set HEYGEN_AVATAR_ID to a valid avatar id in Vercel.");
  }
  cachedAvatarId = (avatars.find((a) => !a.premium) ?? avatars[0]).avatar_id;
  return cachedAvatarId;
}

async function resolveVoiceId(key: string, preferred?: string): Promise<string> {
  if (preferred) return preferred;
  if (cachedVoiceId) return cachedVoiceId;
  const res = await fetchWithTimeout(`${API}/v2/voices`, { headers: { "X-Api-Key": key } }, 12_000);
  const json = await res.json().catch(() => null);
  const voices: { voice_id: string; language?: string }[] = json?.data?.voices ?? [];
  if (!res.ok || voices.length === 0) {
    throw new Error("HeyGen: could not list available voices — set HEYGEN_VOICE_ID to a valid voice id in Vercel.");
  }
  cachedVoiceId = (voices.find((v) => (v.language ?? "").toLowerCase().startsWith("en")) ?? voices[0]).voice_id;
  return cachedVoiceId;
}

export const heygenProvider: AvatarProvider = {
  id: "heygen",
  isConfigured() { return !!process.env.HEYGEN_API_KEY; },

  async createVideo(input: AvatarCreateInput): Promise<AvatarJob> {
    const key = process.env.HEYGEN_API_KEY;
    if (!key) throw new Error("HEYGEN_API_KEY is not set");
    const [avatarId, voiceId] = await Promise.all([
      resolveAvatarId(key, input.avatarId || process.env.HEYGEN_AVATAR_ID),
      resolveVoiceId(key, input.voiceId || process.env.HEYGEN_VOICE_ID),
    ]);
    const res = await fetchWithTimeout(`${API}/v2/video/generate`, {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        video_inputs: [{
          character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
          voice: { type: "text", input_text: input.script, voice_id: voiceId },
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
