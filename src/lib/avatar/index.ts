/** Avatar provider registry. Select with AVATAR_PROVIDER (default: heygen). */
import type { AvatarProvider } from "./types";
import { heygenProvider } from "./heygen";
import { didProvider } from "./did";

const PROVIDERS: Record<string, AvatarProvider> = { heygen: heygenProvider, did: didProvider };

export function getAvatarProvider(): AvatarProvider {
  const id = (process.env.AVATAR_PROVIDER || "heygen").toLowerCase();
  return PROVIDERS[id] ?? heygenProvider;
}
export function isAvatarConfigured(): boolean {
  return getAvatarProvider().isConfigured();
}
export type { AvatarProvider } from "./types";
