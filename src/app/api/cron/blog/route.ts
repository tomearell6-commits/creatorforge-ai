import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureError } from "@/lib/logger";

/**
 * Scheduled blog publisher (Vercel Cron). Flips due scheduled posts to
 * published so they go live on creatorsforge.io/blog and enter the sitemap.
 * Secured by CRON_SECRET (fail-closed if unset). Service-role client, no user
 * session. Pure DB work — no credits, no external calls.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  try {
    const { data: due } = await admin
      .from("blog_posts")
      .select("id, slug")
      .eq("status", "scheduled")
      .lte("scheduled_for", nowIso)
      .limit(50);

    const ids = (due ?? []).map((p) => p.id);
    if (ids.length === 0) return NextResponse.json({ ok: true, published: 0 });

    const { error } = await admin
      .from("blog_posts")
      .update({ status: "published", published_at: nowIso, scheduled_for: null })
      .in("id", ids);
    if (error) throw error;

    return NextResponse.json({ ok: true, published: ids.length, slugs: (due ?? []).map((p) => p.slug) });
  } catch (e) {
    captureError(e, { where: "cron/blog" });
    return NextResponse.json({ error: "Publish sweep failed." }, { status: 500 });
  }
}
