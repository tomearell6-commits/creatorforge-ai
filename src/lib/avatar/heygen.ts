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

type AvatarGroup = { id: string; default_voice_id?: string; looks_count?: number; premium?: boolean };

/**
 * Resolve an avatar + its default voice from /v3/avatars (paginated avatar
 * groups — fast). The old /v2/avatars flat list returns hundreds of looks for
 * established accounts and times out. Both are cached for the process.
 */
async function resolveAvatarAndVoice(
  key: string,
  preferredAvatar?: string,
  preferredVoice?: string
): Promise<{ avatarId: string; voiceId: string }> {
  if ((preferredAvatar || cachedAvatarId) && (preferredVoice || cachedVoiceId)) {
    return { avatarId: preferredAvatar || cachedAvatarId!, voiceId: preferredVoice || cachedVoiceId! };
  }

  const res = await fetchWithTimeout(`${API}/v3/avatars?limit=20`, { headers: { "X-Api-Key": key } }, 25_000);
  const json = await res.json().catch(() => null);
  const groups: AvatarGroup[] =
    json?.data?.avatars ?? json?.data?.avatar_group_list ?? json?.data?.avatar_groups ?? [];
  const usable = groups.find((g) => (g.looks_count ?? 1) > 0 && g.default_voice_id) ?? groups[0];
  if (!res.ok || !usable?.id) {
    throw new Error(
      "HeyGen: could not find an available avatar. Set HEYGEN_AVATAR_ID and HEYGEN_VOICE_ID in Vercel to specific ids from your HeyGen account."
    );
  }
  cachedAvatarId = preferredAvatar || usable.id;
  cachedVoiceId = preferredVoice || usable.default_voice_id || cachedVoiceId || "";
  if (!cachedVoiceId) {
    throw new Error("HeyGen: avatar found but no voice available — set HEYGEN_VOICE_ID in Vercel.");
  }
  return { avatarId: cachedAvatarId, voiceId: cachedVoiceId };
}

export const heygenProvider: AvatarProvider = {
  id: "heygen",
  isConfigured() { return !!process.env.HEYGEN_API_KEY; },

  async createVideo(input: AvatarCreateInput): Promise<AvatarJob> {
    const key = process.env.HEYGEN_API_KEY;
    if (!key) throw new Error("HEYGEN_API_KEY is not set");
    const { avatarId, voiceId } = await resolveAvatarAndVoice(
      key,
      input.avatarId || process.env.HEYGEN_AVATAR_ID,
      input.voiceId || process.env.HEYGEN_VOICE_ID
    );
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
