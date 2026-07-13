/**
 * Live YouTube upload helper (SERVER-ONLY). Loads the user's connected YouTube
 * account, decrypts its tokens, and uploads a rendered video via the real
 * provider (videos.insert). Guards against the placeholder provider so we can
 * NEVER report a fake success.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublishProvider } from "@/lib/publishing/providers";
import { isYouTubeConfigured } from "@/lib/publishing/providers/youtube";
import { decryptSecret } from "@/lib/security/secrets";

export type YouTubeLiveInput = {
  videoUrl?: string | null;
  title?: string | null;
  description?: string | null;
  hashtags?: string[];
  tags?: string[];
  visibility?: "public" | "unlisted" | "private";
};

export async function publishVideoToYouTube(
  supabase: SupabaseClient, input: YouTubeLiveInput
): Promise<{ ok: boolean; url?: string | null; error?: string }> {
  if (!isYouTubeConfigured()) return { ok: false, error: "YouTube isn't configured on the server yet." };
  if (!input.videoUrl) return { ok: false, error: "No rendered video to upload — render a video first, then publish it." };

  // The client is already RLS-scoped to the signed-in user.
  const { data: acct } = await supabase
    .from("social_accounts")
    .select("access_token, refresh_token, external_id, account_name, metadata")
    .eq("platform", "youtube").eq("status", "connected")
    .order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (!acct) return { ok: false, error: "Connect a YouTube account first (Social Business Studio → Connected Accounts)." };

  const refreshToken = decryptSecret(acct.refresh_token ?? null);
  if (!refreshToken) return { ok: false, error: "YouTube authorization is missing a refresh token — reconnect the account." };

  const provider = getPublishProvider("youtube");
  const res = await provider.publish({
    videoUrl: input.videoUrl, title: input.title || "Untitled", description: input.description || "",
    hashtags: input.hashtags ?? [], tags: input.tags ?? [], visibility: input.visibility ?? "unlisted",
    account: {
      accessToken: decryptSecret(acct.access_token ?? null), refreshToken,
      externalId: acct.external_id, accountName: acct.account_name, metadata: acct.metadata ?? null,
    },
  });
  if (res.status === "published") return { ok: true, url: res.externalUrl ?? null };
  return { ok: false, error: res.error ?? "YouTube upload failed." };
}
