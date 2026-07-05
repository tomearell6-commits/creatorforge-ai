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

type AvatarGroup = { id: string; default_voice_id?: string; looks_count?: number };
type AvatarLook = { avatar_id?: string; id?: string; is_default?: boolean };
type Voice = { voice_id: string; language?: string };

/** Pull an array out of a HeyGen `data` payload, whether it's the array itself
 *  or nested under one of the given keys (their shapes vary v2 vs v3). */
function pickArray<T>(data: unknown, ...keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    for (const k of keys) {
      const v = (data as Record<string, unknown>)[k];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

async function hgGet(key: string, path: string, ms = 20_000): Promise<{ data: unknown; raw: string }> {
  const res = await fetchWithTimeout(`${API}${path}`, { headers: { "X-Api-Key": key } }, ms);
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(`HeyGen ${path} → ${res.status}: ${text.slice(0, 180)}`);
  return { data: (json as { data?: unknown })?.data ?? json, raw: text.slice(0, 180) };
}

/**
 * Resolve a real avatar LOOK id + a voice id. HeyGen's generator needs a
 * "look" id (e.g. Daisy-inskirt-…), NOT an avatar-group id — so we list groups
 * (/v3/avatars, fast), then read a look from inside the first group
 * (/v2/avatar_group/{id}/avatars, small). Voice comes from the group's default
 * or /v3/voices. Env overrides skip all of this. Cached per process.
 * Errors surface the raw HeyGen reply so problems are visible, not guessed.
 */
async function resolveAvatarAndVoice(
  key: string,
  preferredAvatar?: string,
  preferredVoice?: string
): Promise<{ avatarId: string; voiceId: string }> {
  if ((preferredAvatar || cachedAvatarId) && (preferredVoice || cachedVoiceId)) {
    return { avatarId: preferredAvatar || cachedAvatarId!, voiceId: preferredVoice || cachedVoiceId! };
  }

  let avatarId = preferredAvatar || cachedAvatarId || "";
  let voiceId = preferredVoice || cachedVoiceId || "";
  let groupDefaultVoice = "";

  // 1) Need an avatar look id → find a group, then a look inside it.
  if (!avatarId) {
    const g = await hgGet(key, "/v3/avatars?limit=10");
    const groups = pickArray<AvatarGroup>(g.data, "avatars", "avatar_group_list", "avatar_groups");
    const group = groups.find((x) => (x.looks_count ?? 1) > 0) ?? groups[0];
    if (!group?.id) throw new Error(`HeyGen returned no avatar groups. Reply: ${g.raw}`);
    groupDefaultVoice = group.default_voice_id || "";

    const l = await hgGet(key, `/v2/avatar_group/${group.id}/avatars`);
    const looks = pickArray<AvatarLook>(l.data, "avatar_list", "avatars", "looks");
    const look = looks.find((x) => x.is_default) ?? looks[0];
    avatarId = look?.avatar_id || look?.id || "";
    if (!avatarId) throw new Error(`HeyGen returned no looks for the avatar group. Reply: ${l.raw}`);
  }

  // 2) Voice: env → group default → first English public voice.
  if (!voiceId) voiceId = groupDefaultVoice;
  if (!voiceId) {
    const v = await hgGet(key, "/v3/voices?type=public&limit=50");
    const voices = pickArray<Voice>(v.data, "voices");
    voiceId = (voices.find((x) => (x.language ?? "").toLowerCase().startsWith("en")) ?? voices[0])?.voice_id || "";
    if (!voiceId) throw new Error(`HeyGen returned no voices. Reply: ${v.raw}`);
  }

  cachedAvatarId = avatarId;
  cachedVoiceId = voiceId;
  return { avatarId, voiceId };
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
