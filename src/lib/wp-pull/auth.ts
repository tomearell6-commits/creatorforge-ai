import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { bearerToken, tokenMatches } from "./token";

/**
 * Authenticates the plugin's calls. The website is identified by the id in the address AND proven by its secret token;
 * a wrong id, a wrong token and a site that does not use pull delivery all look the same (404), so the endpoints
 * reveal nothing to someone guessing.
 */
export type PullSite = { id: string; user_id: string; site_name: string | null; site_url: string };

export async function authenticatePull(request: Request, siteId: string, bucket: string, perMinute: number): Promise<{ ok: true; site: PullSite } | { ok: false; res: Response }> {
  const notFound = () => ({ ok: false as const, res: Response.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } }) });
  const rl = await limitRequestAsync(request, bucket, perMinute, 60_000);
  if (!rl.ok) return { ok: false, res: Response.json({ error: "Too many requests." }, { status: 429, headers: { "Cache-Control": "no-store" } }) };
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) return notFound();
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return notFound();

  const admin = createAdminClient();
  const { data: wp } = await admin.from("wordpress_sites").select("id, user_id, site_name, site_url, delivery, pull_token_hash").eq("id", siteId).maybeSingle();
  if (!wp || wp.delivery !== "pull" || !tokenMatches(token, wp.pull_token_hash as string | null)) return notFound();
  return { ok: true, site: { id: wp.id as string, user_id: wp.user_id as string, site_name: (wp.site_name as string | null) ?? null, site_url: wp.site_url as string } };
}
