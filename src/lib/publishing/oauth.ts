/**
 * Real OAuth + publishing for LinkedIn, Facebook Pages, Instagram, X, Pinterest,
 * TikTok (Phase 8 GA). Each platform activates when its <PLATFORM>_CLIENT_ID +
 * _CLIENT_SECRET env vars are set; otherwise the registry returns null and the
 * publish registry falls back to the placeholder.
 *
 * Connect flow (driven by /api/social + /api/social/callback):
 *   buildAuthorizeUrl(platform, state) -> redirect user to provider consent
 *   oauthExchange(platform, code, {verifier}) -> tokens + account identity
 * Publish flow: getSocialProvider(platform).publish(input)
 *
 * Notes: X uses OAuth2 PKCE (a code_verifier is round-tripped via cookie). FB &
 * Instagram exchange the user token for a Page token. Some publish paths post
 * text/link where full native video upload needs additional approval (documented).
 */
import { createHash, randomBytes } from "crypto";
import type { SocialPlatform } from "@/lib/types";
import type { PublishProvider, PublishInput, PublishResult } from "./types";
import { fetchWithTimeout } from "@/lib/http";

export type ConnectionData = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number;
  externalId: string;
  accountName: string;
  metadata?: Record<string, unknown>;
};

const OAUTH_PLATFORMS: SocialPlatform[] = ["linkedin", "facebook", "instagram", "x", "pinterest", "tiktok"];

function creds(platform: SocialPlatform) {
  const up = platform.toUpperCase();
  return { id: process.env[`${up}_CLIENT_ID`], secret: process.env[`${up}_CLIENT_SECRET`] };
}

export function oauthConfigured(platform: SocialPlatform): boolean {
  if (!OAUTH_PLATFORMS.includes(platform)) return false;
  const { id, secret } = creds(platform);
  return !!id && !!secret;
}

function redirectUri(platform: SocialPlatform): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback?platform=${platform}`;
}

// --- PKCE helpers (X) ---
function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

/** Build the provider consent URL. Returns a verifier when PKCE is required (X). */
export function buildAuthorizeUrl(platform: SocialPlatform, state: string): { url: string; verifier?: string } {
  const { id } = creds(platform);
  const rd = redirectUri(platform);
  switch (platform) {
    case "linkedin": {
      const p = new URLSearchParams({ response_type: "code", client_id: id!, redirect_uri: rd, state, scope: "openid profile w_member_social" });
      return { url: `https://www.linkedin.com/oauth/v2/authorization?${p}` };
    }
    case "facebook": {
      const p = new URLSearchParams({ client_id: id!, redirect_uri: rd, state, scope: "pages_show_list,pages_manage_posts,pages_read_engagement" });
      return { url: `https://www.facebook.com/v21.0/dialog/oauth?${p}` };
    }
    case "instagram": {
      const p = new URLSearchParams({ client_id: id!, redirect_uri: rd, state, scope: "instagram_basic,instagram_content_publish,pages_show_list,business_management" });
      return { url: `https://www.facebook.com/v21.0/dialog/oauth?${p}` };
    }
    case "pinterest": {
      const p = new URLSearchParams({ response_type: "code", client_id: id!, redirect_uri: rd, state, scope: "boards:read,pins:read,pins:write" });
      return { url: `https://www.pinterest.com/oauth/?${p}` };
    }
    case "tiktok": {
      const p = new URLSearchParams({ client_key: id!, redirect_uri: rd, state, response_type: "code", scope: "user.info.basic,video.publish" });
      return { url: `https://www.tiktok.com/v2/auth/authorize/?${p}` };
    }
    case "x": {
      const { verifier, challenge } = pkce();
      const p = new URLSearchParams({
        response_type: "code", client_id: id!, redirect_uri: rd, state,
        scope: "tweet.read tweet.write users.read media.write offline.access",
        code_challenge: challenge, code_challenge_method: "S256",
      });
      return { url: `https://twitter.com/i/oauth2/authorize?${p}`, verifier };
    }
    default:
      throw new Error(`OAuth not implemented for ${platform}`);
  }
}

async function formPost(url: string, body: Record<string, string>, headers: Record<string, string> = {}) {
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Exchange an auth code for tokens + account identity. */
export async function oauthExchange(
  platform: SocialPlatform, code: string, opts: { verifier?: string } = {}
): Promise<ConnectionData> {
  const { id, secret } = creds(platform);
  const rd = redirectUri(platform);

  switch (platform) {
    case "linkedin": {
      const t = await formPost("https://www.linkedin.com/oauth/v2/accessToken", {
        grant_type: "authorization_code", code, redirect_uri: rd, client_id: id!, client_secret: secret!,
      });
      const me = await (await fetchWithTimeout("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
      return { accessToken: t.access_token, refreshToken: t.refresh_token ?? null, expiresIn: t.expires_in, externalId: me.sub, accountName: me.name ?? "LinkedIn" };
    }
    case "facebook":
    case "instagram": {
      const t = await (await fetchWithTimeout(`https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({ client_id: id!, client_secret: secret!, redirect_uri: rd, code })}`)).json();
      if (t.error) throw new Error(t.error.message);
      const accounts = await (await fetchWithTimeout(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${t.access_token}`)).json();
      const page = accounts.data?.[0];
      if (!page) throw new Error("No Facebook Page found on this account.");
      if (platform === "facebook") {
        return { accessToken: page.access_token, refreshToken: null, externalId: page.id, accountName: page.name, metadata: { page_id: page.id } };
      }
      const igId = page.instagram_business_account?.id;
      if (!igId) throw new Error("No Instagram Business account linked to your Page.");
      return { accessToken: page.access_token, refreshToken: null, externalId: igId, accountName: page.name, metadata: { ig_user_id: igId, page_id: page.id } };
    }
    case "pinterest": {
      const basic = Buffer.from(`${id}:${secret}`).toString("base64");
      const t = await formPost("https://api.pinterest.com/v5/oauth/token", { grant_type: "authorization_code", code, redirect_uri: rd }, { Authorization: `Basic ${basic}` });
      const acct = await (await fetchWithTimeout("https://api.pinterest.com/v5/user_account", { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
      const boards = await (await fetchWithTimeout("https://api.pinterest.com/v5/boards?page_size=1", { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
      return { accessToken: t.access_token, refreshToken: t.refresh_token ?? null, expiresIn: t.expires_in, externalId: acct.username ?? "pinterest", accountName: acct.username ?? "Pinterest", metadata: { board_id: boards.items?.[0]?.id ?? null } };
    }
    case "tiktok": {
      const t = await formPost("https://open.tiktokapis.com/v2/oauth/token/", { client_key: id!, client_secret: secret!, code, grant_type: "authorization_code", redirect_uri: rd });
      return { accessToken: t.access_token, refreshToken: t.refresh_token ?? null, expiresIn: t.expires_in, externalId: t.open_id ?? "tiktok", accountName: "TikTok" };
    }
    case "x": {
      const headers: Record<string, string> = {};
      if (secret) headers.Authorization = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
      const t = await formPost("https://api.twitter.com/2/oauth2/token", {
        grant_type: "authorization_code", code, redirect_uri: rd, client_id: id!, code_verifier: opts.verifier ?? "",
      }, headers);
      const me = await (await fetchWithTimeout("https://api.twitter.com/2/users/me", { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
      return { accessToken: t.access_token, refreshToken: t.refresh_token ?? null, expiresIn: t.expires_in, externalId: me.data?.id ?? "x", accountName: me.data?.username ? `@${me.data.username}` : "X" };
    }
    default:
      throw new Error(`OAuth not implemented for ${platform}`);
  }
}

// =====================================================================
// Publish providers
// =====================================================================
function caption(input: PublishInput): string {
  return [input.title, input.description, input.hashtags.join(" ")].filter(Boolean).join("\n\n").trim();
}

const X_UPLOAD = "https://upload.twitter.com/1.1/media/upload.json";

/**
 * Chunked video upload to X (v1.1 media/upload, OAuth2 user token + media.write):
 * INIT → APPEND (4 MB chunks) → FINALIZE → poll STATUS. Returns the media_id, or
 * null if anything fails (caller falls back to a text-only post).
 */
async function uploadXVideo(token: string, videoUrl: string): Promise<string | null> {
  try {
    const vid = await fetchWithTimeout(videoUrl, {}, 30_000);
    if (!vid.ok) return null;
    const bytes = Buffer.from(await vid.arrayBuffer());
    const auth = { Authorization: `Bearer ${token}` };

    // INIT
    const init = await fetchWithTimeout(X_UPLOAD, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        command: "INIT", total_bytes: String(bytes.length), media_type: "video/mp4", media_category: "tweet_video",
      }),
    }, 30_000);
    if (!init.ok) return null;
    const mediaId = (await init.json()).media_id_string as string;

    // APPEND (4 MB segments, multipart/form-data)
    const chunkSize = 4 * 1024 * 1024;
    for (let i = 0, seg = 0; i < bytes.length; i += chunkSize, seg++) {
      const chunk = bytes.subarray(i, i + chunkSize);
      const boundary = `xb${Date.now()}${seg}`;
      const pre = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="command"\r\n\r\nAPPEND\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="media_id"\r\n\r\n${mediaId}\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="segment_index"\r\n\r\n${seg}\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="chunk"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`
      );
      const post = Buffer.from(`\r\n--${boundary}--\r\n`);
      const res = await fetchWithTimeout(X_UPLOAD, {
        method: "POST",
        headers: { ...auth, "Content-Type": `multipart/form-data; boundary=${boundary}` },
        body: Buffer.concat([pre, chunk, post]),
      }, 30_000);
      if (!res.ok) return null;
    }

    // FINALIZE
    const fin = await fetchWithTimeout(X_UPLOAD, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ command: "FINALIZE", media_id: mediaId }),
    }, 30_000);
    if (!fin.ok) return null;
    let info = (await fin.json()).processing_info;

    // Poll STATUS until video processing completes.
    for (let tries = 0; info && info.state !== "succeeded" && tries < 15; tries++) {
      if (info.state === "failed") return null;
      await new Promise((r) => setTimeout(r, Math.min((info.check_after_secs ?? 2) * 1000, 5000)));
      const st = await fetchWithTimeout(`${X_UPLOAD}?command=STATUS&media_id=${mediaId}`, { headers: auth }, 30_000);
      if (!st.ok) return null;
      info = (await st.json()).processing_info;
    }
    return mediaId;
  } catch {
    return null;
  }
}

function makeProvider(platform: SocialPlatform): PublishProvider {
  return {
    id: platform,
    configured: true,
    async publish(input: PublishInput): Promise<PublishResult> {
      const token = input.account.accessToken;
      if (!token) return { status: "failed", error: `${platform} account not authorized.` };
      try {
        switch (platform) {
          case "linkedin": {
            const author = `urn:li:person:${input.account.externalId}`;
            const vis = input.visibility === "private" ? "CONNECTIONS" : "PUBLIC";
            const text = [caption(input), input.videoUrl].filter(Boolean).join("\n\n");
            const res = await fetchWithTimeout("https://api.linkedin.com/v2/ugcPosts", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
              body: JSON.stringify({
                author, lifecycleState: "PUBLISHED",
                specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: "NONE" } },
                visibility: { "com.linkedin.ugc.MemberNetworkVisibility": vis },
              }),
            });
            if (!res.ok) return { status: "failed", error: `LinkedIn ${res.status}: ${(await res.text()).slice(0, 160)}` };
            const id = res.headers.get("x-restli-id") ?? "";
            return { status: "published", externalPostId: id, externalUrl: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
          }
          case "facebook": {
            const pageId = (input.account.metadata?.page_id as string) ?? input.account.externalId;
            const res = await fetchWithTimeout(`https://graph.facebook.com/v21.0/${pageId}/videos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ file_url: input.videoUrl, description: caption(input), access_token: token }),
            }, 30_000);
            const j = await res.json();
            if (!res.ok || j.error) return { status: "failed", error: `Facebook: ${j.error?.message ?? res.status}` };
            return { status: "published", externalPostId: j.id, externalUrl: `https://facebook.com/${j.id}` };
          }
          case "instagram": {
            const ig = input.account.metadata?.ig_user_id as string;
            if (!ig) return { status: "failed", error: "Missing Instagram business account id." };
            const create = await (await fetchWithTimeout(`https://graph.facebook.com/v21.0/${ig}/media`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ media_type: "REELS", video_url: input.videoUrl, caption: caption(input), access_token: token }),
            }, 30_000)).json();
            if (create.error) return { status: "failed", error: `Instagram: ${create.error.message}` };
            // Brief wait for the container to finish processing.
            await new Promise((r) => setTimeout(r, 4000));
            const pub = await (await fetchWithTimeout(`https://graph.facebook.com/v21.0/${ig}/media_publish`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ creation_id: create.id, access_token: token }),
            }, 30_000)).json();
            if (pub.error) return { status: "failed", error: `Instagram publish: ${pub.error.message}` };
            return { status: "published", externalPostId: pub.id, externalUrl: `https://instagram.com/reel/${pub.id}` };
          }
          case "pinterest": {
            const boardId = input.account.metadata?.board_id as string;
            if (!boardId) return { status: "failed", error: "No Pinterest board found — create one first." };
            if (!input.thumbnailUrl) return { status: "failed", error: "Pinterest needs a thumbnail image — generate one first." };
            const res = await fetchWithTimeout("https://api.pinterest.com/v5/pins", {
              method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ board_id: boardId, title: input.title.slice(0, 100), description: input.description.slice(0, 500), link: input.videoUrl || undefined, media_source: { source_type: "image_url", url: input.thumbnailUrl } }),
            });
            const j = await res.json();
            if (!res.ok) return { status: "failed", error: `Pinterest ${res.status}: ${JSON.stringify(j).slice(0, 160)}` };
            return { status: "published", externalPostId: j.id, externalUrl: `https://pinterest.com/pin/${j.id}` };
          }
          case "tiktok": {
            const res = await fetchWithTimeout("https://open.tiktokapis.com/v2/post/publish/video/init/", {
              method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                post_info: { title: caption(input).slice(0, 150), privacy_level: input.visibility === "public" ? "PUBLIC_TO_EVERYONE" : "SELF_ONLY" },
                source_info: { source: "PULL_FROM_URL", video_url: input.videoUrl },
              }),
            }, 30_000);
            const j = await res.json();
            if (j.error && j.error.code !== "ok") return { status: "failed", error: `TikTok: ${j.error.message}` };
            return { status: "published", externalPostId: j.data?.publish_id ?? "", externalUrl: undefined };
          }
          case "x": {
            // Try a chunked video upload; fall back to a text post with the link.
            const mediaId = input.videoUrl ? await uploadXVideo(token, input.videoUrl) : null;
            const tweet: Record<string, unknown> = mediaId
              ? { text: caption(input).slice(0, 280), media: { media_ids: [mediaId] } }
              : { text: [input.title, input.videoUrl].filter(Boolean).join(" ").slice(0, 280) };
            const res = await fetchWithTimeout("https://api.twitter.com/2/tweets", {
              method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify(tweet),
            });
            const j = await res.json();
            if (!res.ok) return { status: "failed", error: `X ${res.status}: ${JSON.stringify(j).slice(0, 160)}` };
            return { status: "published", externalPostId: j.data?.id, externalUrl: j.data?.id ? `https://x.com/i/web/status/${j.data.id}` : undefined };
          }
          default:
            return { status: "failed", error: `Publishing not implemented for ${platform}` };
        }
      } catch (err) {
        return { status: "failed", error: err instanceof Error ? err.message : "Publish failed" };
      }
    },
  };
}

export function getSocialProvider(platform: SocialPlatform): PublishProvider | null {
  if (!oauthConfigured(platform)) return null;
  return makeProvider(platform);
}
