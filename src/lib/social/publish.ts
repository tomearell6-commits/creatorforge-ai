/**
 * Social publish orchestration (SERVER-ONLY). Each platform is tracked
 * INDEPENDENTLY. Live providers publish for real; not-yet-approved providers
 * return an honest "unavailable" / export-ready result and are NEVER reported as
 * "published" without provider confirmation.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/config/socialProviderCapabilities";
import { emitNotification } from "@/lib/notifications";
import { publishVideoToYouTube } from "@/lib/publishing/youtube-live";
import { captureError } from "@/lib/logger";

export type SocialDestination = { platform: SocialProviderId; variationId?: string; scheduleFor?: string | null };
export type SocialPublishResult = { platform: string; status: "published" | "scheduled" | "unavailable" | "export_ready" | "failed"; url?: string | null; message?: string | null };

/** Is there a live CreatorsForge adapter for this provider right now? */
function providerLive(platform: SocialProviderId): boolean {
  return SOCIAL_PROVIDERS[platform]?.live ?? false;
}

/**
 * Publish a YouTube / Shorts destination for real. Loads the chosen content
 * variation, uploads its rendered video via videos.insert, and only reports
 * "published" on confirmed success. Honest fallback when no video is attached.
 */
async function publishYouTubeDestination(
  supabase: SupabaseClient, d: SocialDestination, name: string
): Promise<SocialPublishResult> {
  if (!d.variationId) {
    return { platform: d.platform, status: "unavailable", message: `Attach a rendered video (AI Video Studio) to publish to ${name}.` };
  }
  const { data: v } = await supabase
    .from("social_content_variations")
    .select("video_url, title, content, hashtags")
    .eq("id", d.variationId).maybeSingle();
  const videoUrl = (v as { video_url?: string | null } | null)?.video_url ?? null;
  if (!videoUrl) {
    return { platform: d.platform, status: "unavailable", message: `No rendered video on this post yet — create one in AI Video Studio, then publish to ${name}.` };
  }
  try {
    const r = await publishVideoToYouTube(supabase, {
      videoUrl,
      title: (v as { title?: string | null }).title,
      description: (v as { content?: string | null }).content,
      hashtags: ((v as { hashtags?: string[] | null }).hashtags ?? []) as string[],
      visibility: "unlisted",
    });
    if (r.ok) return { platform: d.platform, status: "published", url: r.url ?? null, message: `Uploaded to ${name}.` };
    return { platform: d.platform, status: "failed", message: r.error ?? `${name} upload failed.` };
  } catch (e) {
    captureError(e, { category: "publishing", platform: d.platform });
    return { platform: d.platform, status: "failed", message: e instanceof Error ? e.message : `${name} upload failed.` };
  }
}

export async function runSocialPublish(
  supabase: SupabaseClient, userId: string,
  input: { projectId?: string | null; campaignId?: string | null; destinations: SocialDestination[]; schedule?: boolean }
): Promise<SocialPublishResult[]> {
  const results: SocialPublishResult[] = [];

  for (const d of input.destinations) {
    const name = SOCIAL_PROVIDERS[d.platform]?.name ?? d.platform;
    const scheduled = input.schedule && d.scheduleFor;
    let result: SocialPublishResult;

    if (scheduled) {
      result = { platform: d.platform, status: "scheduled", message: `Scheduled for ${name}.` };
    } else if (d.platform === "youtube" || d.platform === "youtube_shorts") {
      // Live YouTube upload — needs a rendered video attached to the variation.
      result = await publishYouTubeDestination(supabase, d, name);
    } else if (providerLive(d.platform)) {
      // Live adapters would publish here and only set "published" on confirmed success.
      result = { platform: d.platform, status: "export_ready", message: `${name} package ready.` };
    } else {
      result = { platform: d.platform, status: "unavailable", message: `${name} live posting isn't enabled yet (needs an approved ${name} app). Content is saved — copy it to post manually, or connect once approved.` };
    }

    await supabase.from("social_publish_jobs").insert({
      user_id: userId, project_id: input.projectId ?? null, campaign_id: input.campaignId ?? null,
      platform: d.platform, status: result.status, external_url: result.url ?? null,
      scheduled_for: d.scheduleFor ?? null, error: result.status === "failed" ? result.message : null,
      published_at: result.status === "published" ? new Date().toISOString() : null,
    });
    await supabase.from("social_publish_events").insert({
      user_id: userId, platform: d.platform,
      event_type: result.status === "scheduled" ? "schedule.created" : result.status === "unavailable" ? "publish.unavailable" : "publish." + result.status,
      status: result.status, message: result.message ?? null,
    });
    if (d.variationId) {
      const varStatus = result.status === "published" ? "published" : scheduled ? "scheduled" : "draft";
      await supabase.from("social_content_variations").update({ status: varStatus }).eq("id", d.variationId);
    }
    results.push(result);
  }

  const ok = results.filter((r) => r.status === "published" || r.status === "scheduled").length;
  const gated = results.filter((r) => r.status === "unavailable" || r.status === "export_ready").length;
  try {
    await emitNotification(supabase, {
      userId, type: "publish_success",
      title: input.schedule ? "Posts scheduled" : "Publishing prepared",
      body: [ok ? `${ok} scheduled` : null, gated ? `${gated} ready to post (provider not live yet)` : null].filter(Boolean).join(" · "),
      link: "/dashboard/grow/social-business/publishing",
    });
  } catch { /* best-effort */ }

  return results;
}
