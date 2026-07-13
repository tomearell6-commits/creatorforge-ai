/**
 * GET /api/admin/social-business/stats — platform-wide Social Business Studio
 * usage for admins. Aggregate counts only — never exposes private messages or
 * content. Gated by requireAdmin.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = gate.admin;

  const head = (t: string) => admin.from(t).select("id", { count: "exact", head: true });
  const [projects, variations, campaigns, publishJobs, failedJobs, replies, reports] = await Promise.all([
    head("social_content_projects"), head("social_content_variations"), head("social_campaigns"),
    head("social_publish_jobs"),
    admin.from("social_publish_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    head("social_reply_drafts"), head("social_reports"),
  ]);

  return NextResponse.json({
    stats: {
      contentProjects: projects.count ?? 0, variations: variations.count ?? 0, campaigns: campaigns.count ?? 0,
      publishJobs: publishJobs.count ?? 0, failedPublishJobs: failedJobs.count ?? 0,
      replyDrafts: replies.count ?? 0, reports: reports.count ?? 0,
    },
  });
}
