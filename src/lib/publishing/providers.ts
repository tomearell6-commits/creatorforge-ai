/**
 * Publishing provider registry (Phase 6).
 *
 * `getPublishProvider(platform)` returns a real provider when its OAuth client
 * env vars are present, otherwise a placeholder that simulates publishing. Add a
 * real integration by implementing PublishProvider and returning it from the
 * switch when configured — no route or UI change required.
 */
import type { SocialPlatform } from "@/lib/types";
import type { PublishProvider, PublishInput, PublishResult } from "./types";
import { PLATFORMS } from "@/lib/constants";
import { wordpressProvider } from "./providers/wordpress";
import { youtubeProvider, isYouTubeConfigured } from "./providers/youtube";

/** A platform is "configured" for real publishing when its client id + secret exist. */
export function isPlatformConfigured(platform: SocialPlatform): boolean {
  const meta = PLATFORMS.find((p) => p.id === platform);
  if (!meta) return false;
  const id = process.env[meta.envClientId];
  const secret = process.env[meta.envClientId.replace("CLIENT_ID", "CLIENT_SECRET")];
  return !!id && !!secret;
}

function placeholderProvider(platform: SocialPlatform): PublishProvider {
  return {
    id: platform,
    configured: false,
    async publish(input: PublishInput): Promise<PublishResult> {
      // Simulate a successful publish with a deterministic fake post id/url.
      const postId = `ph_${platform}_${Date.now().toString(36)}`;
      const slug = encodeURIComponent(input.title.slice(0, 40).replace(/\s+/g, "-") || postId);
      return {
        status: "published",
        externalPostId: postId,
        externalUrl: `https://${platform}.example/${slug}`,
      };
    },
  };
}

export function getPublishProvider(platform: SocialPlatform): PublishProvider {
  // WordPress is a real provider (REST API + application password on the account).
  if (platform === "wordpress") return wordpressProvider();
  // YouTube is real when its OAuth client is configured.
  if (platform === "youtube" && isYouTubeConfigured()) return youtubeProvider();
  // Remaining platforms: real providers return here when configured; else placeholder.
  return placeholderProvider(platform);
}
