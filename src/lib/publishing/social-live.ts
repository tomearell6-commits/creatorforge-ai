/**
 * Live social publishing helper (SERVER-ONLY). Loads the user's connected
 * account for a platform (facebook, instagram, linkedin, x, pinterest, tiktok),
 * decrypts its tokens, and posts via the real provider. Never fakes success —
 * returns an honest error if the platform isn't configured or connected.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSocialProvider, oauthConfigured } from "@/lib/publishing/oauth";
import { decryptSecret } from "@/lib/security/secrets";
import { fetchWithTimeout } from "@/lib/http";
import type { SocialPlatform } from "@/lib/types";

export type SocialLiveInput = {
  videoUrl?: string | null;
  title?: string | null;
  description?: string | null;
  hashtags?: string[];
  thumbnailUrl?: string | null;
  visibility?: "public" | "unlisted" | "private";
};

export async function publishToSocialPlatform(
  supabase: SupabaseClient, platform: SocialPlatform, input: SocialLiveInput
): Promise<{ ok: boolean; url?: string | null; error?: string }> {
  if (!oauthConfigured(platform)) return { ok: false, error: `${platform} isn't set up on the server yet.` };

  // RLS-scoped to the signed-in user; newest connected account wins.
  const { data: acct } = await supabase
    .from("social_accounts")
    .select("access_token, refresh_token, external_id, account_name, metadata")
    .eq("platform", platform).eq("status", "connected")
    .order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (!acct) return { ok: false, error: `Connect a ${platform} account first (Manage → Integrations).` };

  const accessToken = decryptSecret(acct.access_token ?? null);
  if (!accessToken) return { ok: false, error: `${platform} authorization is missing — reconnect the account.` };

  const provider = getSocialProvider(platform);
  if (!provider) return { ok: false, error: `${platform} publishing isn't available.` };

  const res = await provider.publish({
    videoUrl: input.videoUrl ?? "",
    title: input.title || "",
    description: input.description || "",
    hashtags: input.hashtags ?? [],
    tags: [],
    thumbnailUrl: input.thumbnailUrl ?? undefined,
    visibility: input.visibility ?? "public",
    account: {
      accessToken,
      refreshToken: decryptSecret(acct.refresh_token ?? null),
      externalId: acct.external_id,
      accountName: acct.account_name,
      metadata: acct.metadata ?? null,
    },
  });
  if (res.status === "published") return { ok: true, url: res.externalUrl ?? null };
  return { ok: false, error: res.error ?? `${platform} publish failed.` };
}

/**
 * Publish a proper Facebook Reel (dedicated /video_reels API — 3 phases: start,
 * hosted-file upload, finish). Reuses the connected Facebook Page account.
 * Requires a rendered video.
 */
export async function publishFacebookReel(
  supabase: SupabaseClient, input: SocialLiveInput
): Promise<{ ok: boolean; url?: string | null; error?: string }> {
  if (!input.videoUrl) return { ok: false, error: "Facebook Reels needs a rendered video — render your video first, then publish." };
  if (!oauthConfigured("facebook")) return { ok: false, error: "Facebook isn't set up on the server yet." };

  const { data: acct } = await supabase
    .from("social_accounts")
    .select("access_token, external_id, metadata")
    .eq("platform", "facebook").eq("status", "connected")
    .order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (!acct) return { ok: false, error: "Connect a Facebook account first (Manage → Integrations)." };

  const token = decryptSecret(acct.access_token ?? null);
  if (!token) return { ok: false, error: "Facebook authorization is missing — reconnect the account." };
  const pageId = ((acct.metadata as Record<string, unknown> | null)?.page_id as string) ?? acct.external_id;
  const caption = [input.title, input.description, (input.hashtags ?? []).join(" ")].filter(Boolean).join("\n\n").trim();

  try {
    // 1. Start an upload session.
    const start = await (await fetchWithTimeout(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_phase: "start", access_token: token }),
    }, 30_000)).json();
    if (start.error) return { ok: false, error: `Facebook Reels: ${start.error.message}` };
    const videoId = start.video_id as string;
    const uploadUrl = start.upload_url as string;
    if (!videoId || !uploadUrl) return { ok: false, error: "Facebook Reels: couldn't start the upload." };

    // 2. Upload the hosted video by URL (Facebook fetches it).
    const up = await fetchWithTimeout(uploadUrl, { method: "POST", headers: { Authorization: `OAuth ${token}`, file_url: input.videoUrl } }, 60_000);
    if (!up.ok) return { ok: false, error: `Facebook Reels upload failed (${up.status}).` };

    // 3. Finish + publish.
    const fin = await (await fetchWithTimeout(
      `https://graph.facebook.com/v21.0/${pageId}/video_reels?${new URLSearchParams({ upload_phase: "finish", video_id: videoId, video_state: "PUBLISHED", description: caption, access_token: token })}`,
      { method: "POST" }, 30_000
    )).json();
    if (fin.error) return { ok: false, error: `Facebook Reels publish: ${fin.error.message}` };
    return { ok: true, url: `https://www.facebook.com/reel/${videoId}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Facebook Reels failed" };
  }
}
