/**
 * Publish execution (Phase 6). Runs a single scheduled post through its platform
 * provider, records publish_history, updates statuses, and emits a notification
 * + analytics event. Reused by the publish route (mode "now") and any future
 * scheduler/cron that drains due scheduled_posts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublishJob, ScheduledPost, SocialAccount } from "@/lib/types";
import { getPublishProvider } from "./providers";
import { emitNotification } from "@/lib/notifications";
import { logEvent } from "@/lib/analytics";

export async function executePost(
  supabase: SupabaseClient,
  job: PublishJob,
  post: ScheduledPost,
  account: Pick<SocialAccount, "external_id" | "account_name"> | null
): Promise<{ status: "published" | "failed"; error?: string }> {
  await supabase.from("scheduled_posts").update({ status: "publishing" }).eq("id", post.id);

  let result;
  if (!account) {
    result = { status: "failed" as const, error: `No connected ${post.platform} account` };
  } else {
    const provider = getPublishProvider(post.platform);
    try {
      result = await provider.publish({
        videoUrl: job.video_url ?? "",
        title: job.title,
        description: job.description,
        hashtags: job.hashtags,
        tags: job.tags,
        thumbnailUrl: job.thumbnail_url,
        playlist: job.playlist,
        category: job.category,
        visibility: job.visibility,
        account: { externalId: account.external_id, accountName: account.account_name },
      });
    } catch (err) {
      result = { status: "failed" as const, error: err instanceof Error ? err.message : "Publish failed" };
    }
  }

  const published = result.status === "published";

  await supabase.from("publish_history").insert({
    user_id: job.user_id,
    publish_job_id: job.id,
    scheduled_post_id: post.id,
    platform: post.platform,
    status: result.status,
    external_post_id: result.externalPostId ?? null,
    external_url: result.externalUrl ?? null,
    error: result.error ?? null,
    published_at: published ? new Date().toISOString() : null,
  });

  await supabase
    .from("scheduled_posts")
    .update({ status: result.status, updated_at: new Date().toISOString() })
    .eq("id", post.id);

  await emitNotification(supabase, {
    userId: job.user_id,
    type: published ? "publish_success" : "publish_failed",
    title: published ? `Published to ${post.platform}` : `Failed to publish to ${post.platform}`,
    body: published ? job.title : result.error,
    link: "/dashboard/publish",
    metadata: { platform: post.platform, job_id: job.id },
  });

  if (published) {
    await logEvent(supabase, {
      userId: job.user_id,
      eventType: "video_published",
      platform: post.platform,
      projectId: job.project_id,
    });
  }

  return { status: result.status, error: result.error };
}
