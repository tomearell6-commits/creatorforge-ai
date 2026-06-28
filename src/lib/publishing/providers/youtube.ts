/**
 * YouTube publishing provider (real OAuth + upload). Activates when
 * YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET are set; otherwise the registry uses
 * the placeholder. Implements the Google OAuth2 web flow and an authenticated
 * video upload via the YouTube Data API v3 (videos.insert, multipart).
 *
 * Google Cloud setup: create an OAuth client (Web), add redirect
 *   <APP_URL>/api/social/callback?platform=youtube, enable "YouTube Data API v3",
 *   request scope youtube.upload. Production use of youtube.upload requires app
 *   verification (or test users while unverified).
 */
import type { PublishProvider, PublishInput, PublishResult } from "../types";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"];

function redirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback?platform=youtube`;
}

export function youtubeAuthorizeUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // ensure a refresh_token is returned
    state,
  });
  return `${AUTH}?${p.toString()}`;
}

export async function youtubeExchangeCode(code: string): Promise<{
  accessToken: string; refreshToken: string | null; expiresIn: number;
}> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return { accessToken: j.access_token, refreshToken: j.refresh_token ?? null, expiresIn: j.expires_in };
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  return (await res.json()).access_token;
}

export async function youtubeChannel(accessToken: string): Promise<{ id: string; title: string }> {
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`YouTube channel fetch failed: ${res.status}`);
  const item = (await res.json()).items?.[0];
  return { id: item?.id ?? "", title: item?.snippet?.title ?? "YouTube channel" };
}

export function isYouTubeConfigured(): boolean {
  return !!process.env.YOUTUBE_CLIENT_ID && !!process.env.YOUTUBE_CLIENT_SECRET;
}

export function youtubeProvider(): PublishProvider {
  return {
    id: "youtube",
    configured: true,
    async publish(input: PublishInput): Promise<PublishResult> {
      const refresh = input.account.refreshToken;
      if (!refresh) return { status: "failed", error: "YouTube account not authorized (missing refresh token)." };
      if (!input.videoUrl) return { status: "failed", error: "No rendered video to upload." };

      try {
        const accessToken = await refreshAccessToken(refresh);

        const video = await fetch(input.videoUrl);
        if (!video.ok) return { status: "failed", error: "Could not fetch the rendered video." };
        const bytes = Buffer.from(await video.arrayBuffer());

        const privacyStatus =
          input.visibility === "public" ? "public" : input.visibility === "private" ? "private" : "unlisted";
        const metadata = JSON.stringify({
          snippet: {
            title: input.title.slice(0, 100),
            description: [input.description, "", input.hashtags.join(" ")].filter(Boolean).join("\n"),
            tags: [...input.hashtags, ...input.tags].map((t) => t.replace(/^#/, "")).slice(0, 15),
            categoryId: "22", // People & Blogs
          },
          status: { privacyStatus, selfDeclaredMadeForKids: false },
        });

        const boundary = `cfb${Date.now()}`;
        const body = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
          Buffer.from(`--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`),
          bytes,
          Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        const up = await fetch(
          "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
            body,
          }
        );
        if (!up.ok) return { status: "failed", error: `YouTube upload error ${up.status}: ${(await up.text()).slice(0, 200)}` };
        const created = await up.json();
        return { status: "published", externalPostId: created.id, externalUrl: `https://youtu.be/${created.id}` };
      } catch (err) {
        return { status: "failed", error: err instanceof Error ? err.message : "YouTube publish failed" };
      }
    },
  };
}
