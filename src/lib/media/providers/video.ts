import type { VideoProvider } from "../types";
import { falVideoProvider } from "./fal";

/**
 * Placeholder video provider — returns "placeholder" status with no URL.
 * Real AI video is provided by fal.ai (VIDEO_PROVIDER=fal + FAL_KEY).
 */
const placeholderVideoProvider: VideoProvider = {
  id: "placeholder",
  name: "CreatorsForge Placeholder Video",
  async generate() {
    return { url: null, status: "placeholder", provider: "placeholder" };
  },
};

/** Resolve the active video provider from VIDEO_PROVIDER. */
export function getVideoProvider(): VideoProvider {
  switch (process.env.VIDEO_PROVIDER) {
    case "fal":
      return falVideoProvider;
    default:
      return placeholderVideoProvider;
  }
}
