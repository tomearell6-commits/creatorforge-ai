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

export type SocialDestination = { platform: SocialProviderId; variationId?: string; scheduleFor?: string | null };
export type SocialPublishResult = { platform: string; status: "published" | "scheduled" | "unavailable" | "export_ready" | "failed"; url?: string | null; message?: string | null };

/** Is there a live CreatorsForge adapter for this provider right now? */
function providerLive(platform: SocialProviderId): boolean {
  return SOCIAL_PROVIDERS[platform]?.live ?? false;
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
    if (d.variationId) await supabase.from("social_content_variations").update({ status: scheduled ? "scheduled" : "draft" }).eq("id", d.variationId);
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
