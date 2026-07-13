/**
 * Unified publish orchestration (SERVER-ONLY).
 *
 * Runs a "publish" or "schedule" across one or more destinations. Each
 * destination is tracked INDEPENDENTLY — one failure never fails the others.
 *
 * Honesty rule: we only report status "published" when a REAL provider confirms
 * it. Destinations that aren't live yet (social, ads, mailchimp, …) return an
 * "export_ready" package the user can use immediately — never a fake success.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isDestinationLive, PUBLISH_DESTINATIONS,
  type ContentTypeId, type PublishDestinationId,
} from "@/config/publishingCapabilities";
import { publishArticleToWordPress } from "@/lib/seo/publish";
import { publishVideoToYouTube } from "@/lib/publishing/youtube-live";
import { decryptSecret } from "@/lib/security/secrets";
import { fetchWithTimeout } from "@/lib/http";
import { emitNotification } from "@/lib/notifications";
import { captureError } from "@/lib/logger";

export type PublishMetadata = {
  title?: string;
  description?: string;
  caption?: string;
  hashtags?: string[];
  slug?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  author?: string;
  featuredImage?: string;
  visibility?: "public" | "unlisted" | "private";
  cta?: string;
  [k: string]: unknown;
};

export type PublishRequest = {
  contentType: ContentTypeId;
  sourceKind?: string;
  sourceId?: string | null;
  destinations: PublishDestinationId[];
  metadata: PublishMetadata;
  /** Final asset URL (video/image/pdf) or article HTML. */
  assetUrl?: string | null;
  contentHtml?: string | null;
  /** WordPress/WooCommerce target site (wordpress_sites.id). */
  wpSiteId?: string | null;
  /** Custom webhook URL for the custom_webhook destination. */
  webhookUrl?: string | null;
  /** ISO datetime → schedule instead of publish now. */
  scheduleFor?: string | null;
};

export type DestinationResult = {
  destination: PublishDestinationId;
  status: "published" | "scheduled" | "export_ready" | "failed";
  url?: string | null;
  error?: string | null;
  package?: Record<string, unknown> | null;
  live: boolean;
};

/** Build an honest, ready-to-use export package for a not-yet-live destination. */
function buildExportPackage(
  destination: PublishDestinationId, req: PublishRequest
): Record<string, unknown> {
  const meta = PUBLISH_DESTINATIONS[destination];
  return {
    destination,
    platform: meta.label,
    note: `${meta.label} live auto-posting isn't enabled yet. This package is ready to post manually — copy the fields below, or connect ${meta.label} once its app is enabled to publish automatically.`,
    title: req.metadata.title ?? null,
    body: req.metadata.description ?? req.metadata.caption ?? null,
    caption: req.metadata.caption ?? null,
    hashtags: req.metadata.hashtags ?? [],
    cta: req.metadata.cta ?? null,
    assetUrl: req.assetUrl ?? null,
    scheduledFor: req.scheduleFor ?? null,
  };
}

/** Publish one destination for real (live providers only). */
async function publishLive(
  supabase: SupabaseClient, userId: string,
  destination: PublishDestinationId, req: PublishRequest
): Promise<{ status: "published" | "scheduled" | "failed"; url?: string | null; error?: string }> {
  // WordPress / WooCommerce — real article/page publish via REST.
  if (destination === "wordpress" || destination === "woocommerce") {
    if (!req.wpSiteId) return { status: "failed", error: "Choose a WordPress site to publish to." };
    const { data: site } = await supabase
      .from("wordpress_sites")
      .select("site_url, username, encrypted_application_password")
      .eq("id", req.wpSiteId).single();
    if (!site) return { status: "failed", error: "WordPress site not found or not yours." };
    const appPassword = decryptSecret(site.encrypted_application_password);
    if (!appPassword) return { status: "failed", error: "WordPress credentials unavailable — reconnect the site." };

    const res = await publishArticleToWordPress({
      siteUrl: site.site_url, username: site.username, appPassword,
      title: req.metadata.title ?? "Untitled",
      contentHtml: req.contentHtml ?? `<p>${req.metadata.description ?? ""}</p>`,
      excerpt: req.metadata.excerpt, slug: req.metadata.slug,
      category: req.metadata.category, tags: req.metadata.tags,
      metaTitle: req.metadata.title, metaDescription: req.metadata.description,
      status: req.scheduleFor ? "future" : "publish",
      scheduledAt: req.scheduleFor ?? undefined,
    });
    if (!res.ok) return { status: "failed", error: res.error };
    return { status: req.scheduleFor ? "scheduled" : "published", url: res.url };
  }

  // Custom webhook — POST the content JSON to the user's endpoint.
  if (destination === "custom_webhook") {
    if (!req.webhookUrl) return { status: "failed", error: "Provide your webhook URL." };
    try {
      const res = await fetchWithTimeout(req.webhookUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: req.contentType, metadata: req.metadata, assetUrl: req.assetUrl, contentHtml: req.contentHtml }),
      }, 15_000);
      if (!res.ok) return { status: "failed", error: `Webhook responded ${res.status}` };
      return { status: "published", url: req.webhookUrl };
    } catch (e) {
      return { status: "failed", error: e instanceof Error ? e.message : "Webhook call failed" };
    }
  }

  // YouTube / Shorts — real video upload (videos.insert) when a rendered video exists.
  if (destination === "youtube" || destination === "youtube_shorts") {
    if (req.scheduleFor) return { status: "scheduled" }; // native scheduling handled by the queue
    const r = await publishVideoToYouTube(supabase, {
      videoUrl: req.assetUrl, title: req.metadata.title, description: req.metadata.description,
      hashtags: req.metadata.hashtags, tags: req.metadata.tags, visibility: req.metadata.visibility,
    });
    if (!r.ok) return { status: "failed", error: r.error };
    return { status: "published", url: r.url };
  }

  return { status: "failed", error: "This destination has no live adapter yet." };
}

/**
 * Run a publish/schedule across all requested destinations. Records one
 * publish_job_destinations row + one publishing_events row per destination, and
 * emits a summary notification. Returns per-destination results.
 */
export async function runPublish(
  supabase: SupabaseClient, userId: string, req: PublishRequest
): Promise<{ jobId: string; results: DestinationResult[] }> {
  const jobId = crypto.randomUUID();
  const results: DestinationResult[] = [];

  for (const destination of req.destinations) {
    const live = isDestinationLive(destination);
    let result: DestinationResult;

    if (!live) {
      const pkg = buildExportPackage(destination, req);
      result = { destination, status: "export_ready", package: pkg, live: false, url: null };
    } else {
      try {
        const r = await publishLive(supabase, userId, destination, req);
        result = { destination, status: r.status, url: r.url ?? null, error: r.error ?? null, live: true };
      } catch (e) {
        captureError(e, { category: "publishing", destination });
        result = { destination, status: "failed", error: e instanceof Error ? e.message : "Publish failed", live: true };
      }
    }

    // Persist per-destination row (independent tracking).
    await supabase.from("publish_job_destinations").insert({
      user_id: userId, job_id: jobId, content_type: req.contentType, destination,
      status: result.status,
      external_url: result.url ?? null,
      scheduled_for: req.scheduleFor ?? null,
      published_at: result.status === "published" ? new Date().toISOString() : null,
      error: result.error ?? null,
      export_package: result.package ?? null,
    });
    await supabase.from("publishing_events").insert({
      user_id: userId,
      event_type: result.status === "failed" ? "publish.failed"
        : result.status === "scheduled" ? "schedule.created"
        : result.status === "export_ready" ? "export.ready" : "publish.success",
      content_type: req.contentType, ref_id: req.sourceId ?? null, platform: destination,
      status: result.status, message: result.error ?? null,
      metadata: { jobId, url: result.url ?? null },
    });

    results.push(result);
  }

  // Summary notification (best-effort).
  const okCount = results.filter((r) => r.status === "published" || r.status === "scheduled").length;
  const failCount = results.filter((r) => r.status === "failed").length;
  const pkgCount = results.filter((r) => r.status === "export_ready").length;
  try {
    await emitNotification(supabase, {
      userId,
      type: failCount && !okCount ? "publish_failed" : "publish_success",
      title: failCount && !okCount ? "Publishing failed" : "Publishing complete",
      body: [
        okCount ? `${okCount} published/scheduled` : null,
        pkgCount ? `${pkgCount} export package${pkgCount === 1 ? "" : "s"} ready` : null,
        failCount ? `${failCount} failed` : null,
      ].filter(Boolean).join(" · "),
      link: "/dashboard/calendar",
    });
  } catch { /* notification is best-effort */ }

  return { jobId, results };
}
