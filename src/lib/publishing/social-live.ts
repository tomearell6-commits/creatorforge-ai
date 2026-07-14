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
