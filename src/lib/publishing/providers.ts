/**
 * Publishing provider registry (Phase 6).
 *
 * `getPublishProvider(platform)` returns a real provider when its OAuth client
 * env vars are present, otherwise an "unconfigured" provider that FAILS HONESTLY
 * (never fakes a publish). Add a real integration by implementing PublishProvider
 * and returning it from the switch when configured — no route or UI change needed.
 */
import type { SocialPlatform } from "@/lib/types";
import type { PublishProvider, PublishResult } from "./types";
import { PLATFORMS } from "@/lib/constants";
import { wordpressProvider } from "./providers/wordpress";
import { youtubeProvider, isYouTubeConfigured } from "./providers/youtube";
import { getSocialProvider } from "./oauth";

/** A platform is "configured" for real publishing when its client id + secret exist. */
export function isPlatformConfigured(platform: SocialPlatform): boolean {
  const meta = PLATFORMS.find((p) => p.id === platform);
  if (!meta) return false;
  const id = process.env[meta.envClientId];
  const secret = process.env[meta.envClientId.replace("CLIENT_ID", "CLIENT_SECRET")];
  return !!id && !!secret;
}

function unconfiguredProvider(platform: SocialPlatform): PublishProvider {
  const name = PLATFORMS.find((p) => p.id === platform)?.name ?? platform;
  return {
    id: platform,
    configured: false,
    async publish(): Promise<PublishResult> {
      // NEVER fake success. A platform with no live adapter fails honestly — the
      // user's content is saved and can be posted once an approved app for that
      // platform is connected.
      return {
        status: "failed",
        error: `${name} live posting isn't enabled yet. Connect an approved ${name} app to publish — your content is saved.`,
      };
    },
  };
}

export function getPublishProvider(platform: SocialPlatform): PublishProvider {
  // WordPress is a real provider (REST API + application password on the account).
  if (platform === "wordpress") return wordpressProvider();
  // YouTube is real when its OAuth client is configured.
  if (platform === "youtube" && isYouTubeConfigured()) return youtubeProvider();
  // LinkedIn / Facebook / Instagram / X / Pinterest / TikTok via the OAuth registry.
  const social = getSocialProvider(platform);
  if (social) return social;
  // Otherwise: no live adapter — fail honestly, never simulate a publish.
  return unconfiguredProvider(platform);
}
