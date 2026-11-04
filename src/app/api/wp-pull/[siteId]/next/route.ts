import { createAdminClient } from "@/lib/supabase/admin";
import { authenticatePull } from "@/lib/wp-pull/auth";
import { claimNext } from "@/lib/wp-pull/queue";

/** The plugin asks: is there a finished article for my website? Answers 204 (nothing) or { item: { id, payload } }. */
export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const a = await authenticatePull(request, siteId, "wp-pull-next", 60);
  if (!a.ok) return a.res;
  const admin = createAdminClient();
  await admin.from("wordpress_sites").update({ last_pull_at: new Date().toISOString() }).eq("id", a.site.id);
  const item = await claimNext(admin, a.site.id);
  if (!item) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  return Response.json({ item }, { headers: { "Cache-Control": "no-store" } });
}
