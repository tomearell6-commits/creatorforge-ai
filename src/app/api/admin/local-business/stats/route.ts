/**
 * GET /api/admin/local-business/stats — platform-wide Local Business Studio
 * usage for admins. Aggregate counts only — never exposes private business
 * content. Gated by requireAdmin.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { gbpApiConfigured } from "@/lib/local-business/service";

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = gate.admin;

  const head = (t: string) => admin.from(t).select("id", { count: "exact", head: true });
  const [accounts, locations, audits, posts, images, reviewDrafts, failedJobs] = await Promise.all([
    head("local_business_accounts"),
    head("local_business_locations"),
    head("local_business_audits"),
    head("local_business_posts"),
    head("local_business_post_assets"),
    head("local_business_review_drafts"),
    admin.from("local_business_publish_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  return NextResponse.json({
    liveApiConfigured: gbpApiConfigured(),
    stats: {
      accounts: accounts.count ?? 0,
      locations: locations.count ?? 0,
      audits: audits.count ?? 0,
      posts: posts.count ?? 0,
      images: images.count ?? 0,
      reviewDrafts: reviewDrafts.count ?? 0,
      failedPublishJobs: failedJobs.count ?? 0,
    },
  });
}
