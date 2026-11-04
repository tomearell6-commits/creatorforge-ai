import { createAdminClient } from "@/lib/supabase/admin";
import { authenticatePull } from "@/lib/wp-pull/auth";

/** The plugin's "check connection" button. Also records that the website is alive. */
export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const a = await authenticatePull(request, siteId, "wp-pull-ping", 60);
  if (!a.ok) return a.res;
  await createAdminClient().from("wordpress_sites").update({ last_pull_at: new Date().toISOString() }).eq("id", a.site.id);
  return Response.json({ ok: true, site: a.site.site_name ?? a.site.site_url }, { headers: { "Cache-Control": "no-store" } });
}
