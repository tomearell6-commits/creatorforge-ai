import { createAdminClient } from "@/lib/supabase/admin";
import { authenticatePull } from "@/lib/wp-pull/auth";
import { recentCoverImages } from "@/lib/wp-pull/queue";

/** The plugin asks: which recent articles should have a cover picture, and where is it? Read-only: nothing is charged or changed. */
export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const a = await authenticatePull(request, siteId, "wp-pull-images", 12);
  if (!a.ok) return a.res;
  const items = await recentCoverImages(createAdminClient(), a.site.id);
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
