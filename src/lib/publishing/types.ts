/**
 * Publishing provider interface (Phase 6).
 *
 * Each social platform implements `PublishProvider`. Like the media engine,
 * providers are env-driven: a real provider activates when its OAuth client env
 * vars are set; otherwise a placeholder simulates a successful publish so the
 * whole pipeline (compose → schedule → publish → history → analytics) works
 * end-to-end without external credentials.
 */
import type { SocialPlatform, Visibility } from "@/lib/types";

export type PublishInput = {
  videoUrl: string;
  title: string;
  description: string;
  /** Full article body (HTML or text) for blog targets like WordPress. */
  articleHtml?: string | null;
  hashtags: string[];
  tags: string[];
  thumbnailUrl?: string | null;
  playlist?: string | null;
  category?: string | null;
  visibility: Visibility;
  account: {
    accessToken?: string | null;
    refreshToken?: string | null;
    externalId?: string | null;
    accountName?: string | null;
    /** WordPress credential fields. */
    siteUrl?: string | null;
    username?: string | null;
  };
};

export type PublishResult = {
  status: "published" | "failed";
  externalPostId?: string;
  externalUrl?: string;
  error?: string;
};

export interface PublishProvider {
  id: SocialPlatform;
  /** True when real API credentials are configured for this platform. */
  configured: boolean;
  publish(input: PublishInput): Promise<PublishResult>;
}
