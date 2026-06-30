/**
 * D-ID talking-avatar provider (/talks). Env: DID_API_KEY (the "user:pass" or
 * api-key string D-ID issues), optional DID_PRESENTER_IMAGE_URL, DID_VOICE_ID.
 * D-ID animates a presenter image speaking the script.
 * Docs: https://docs.d-id.com/
 */
import type { AvatarProvider, AvatarCreateInput, AvatarJob, AvatarStatus } from "./types";

const API = "https://api.d-id.com";

function authHeader(): string {
  const k = process.env.DID_API_KEY || "";
  // D-ID accepts Basic <base64(apikey)>; tolerate a pre-encoded value too.
  return k.includes(":") ? `Basic ${Buffer.from(k).toString("base64")}` : `Basic ${k}`;
}

export const didProvider: AvatarProvider = {
  id: "did",
  isConfigured() { return !!process.env.DID_API_KEY && !!process.env.DID_PRESENTER_IMAGE_URL; },

  async createVideo(input: AvatarCreateInput): Promise<AvatarJob> {
    if (!process.env.DID_API_KEY) throw new Error("DID_API_KEY is not set");
    const res = await fetch(`${API}/talks`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        source_url: input.avatarId || process.env.DID_PRESENTER_IMAGE_URL,
        script: { type: "text", input: input.script, provider: { type: "microsoft", voice_id: input.voiceId || process.env.DID_VOICE_ID || "en-US-JennyNeural" } },
      }),
    });
    const json = await res.json();
    if (!res.ok || !json?.id) throw new Error(`D-ID create failed: ${res.status} ${JSON.stringify(json)}`);
    return { provider: "did", jobId: json.id };
  },

  async getStatus(jobId: string): Promise<AvatarStatus> {
    const res = await fetch(`${API}/talks/${encodeURIComponent(jobId)}`, { headers: { Authorization: authHeader() } });
    const json = await res.json();
    if (json?.status === "done") return { status: "completed", url: json.result_url };
    if (json?.status === "error") return { status: "failed", error: JSON.stringify(json?.error || json) };
    return { status: "processing" };
  },
};
