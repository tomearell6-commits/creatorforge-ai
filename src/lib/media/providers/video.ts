import type { VideoProvider } from "../types";

/**
 * Placeholder video provider. Real text-to-video is out of scope for Phase 3,
 * so this records the request and returns a "placeholder" status with no URL.
 * Wire up Replicate / Runway / etc. via VIDEO_PROVIDER in Phase 4.
 */
const placeholderVideoProvider: VideoProvider = {
  id: "placeholder",
  name: "CreatorForge Placeholder Video",
  async generate() {
    return { url: null, status: "placeholder", provider: "placeholder" };
  },
};

/** Resolve the active video provider from VIDEO_PROVIDER. */
export function getVideoProvider(): VideoProvider {
  switch (process.env.VIDEO_PROVIDER) {
    // case "replicate": return replicateVideoProvider;
    default:
      return placeholderVideoProvider;
  }
}
