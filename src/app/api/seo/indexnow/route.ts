import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { detectRankMath, generateIndexNowKey, isValidIndexNowKey, verifyIndexNowKeyFile } from "@/lib/seo/indexnow";

/**
 * IndexNow connection status for the signed-in user's WordPress sites.
 *  GET  → every site with its IndexNow state (connected / key / error)
 *  POST { siteId, key? } → create (or accept the plugin's) key, check the key file on the
 *        site, and save the result. Call again after uploading the file to re-check.
 * IndexNow is free; "connected" means the site serves its key file, so every post we
 * publish can be announced to Bing, Yandex, Naver, Seznam and Yep right away.
 */
type Meta = { indexnow_key?: string; indexnow_verified_at?: string | null; indexnow_error?: string | null; rank_math?: boolean | null };

function shape(site: { id: string; site_name: string; site_url: string; metadata: unknown }) {
  const m = (site.metadata ?? {}) as Meta;
  return {
    id: site.id,
    siteName: site.site_name,
    siteUrl: site.site_url,
    connected: !!m.indexnow_verified_at,
    key: m.indexnow_key ?? null,
    fileName: m.indexnow_key ? `${m.indexnow_key}.txt` : null,
    verifiedAt: m.indexnow_verified_at ?? null,
    error: m.indexnow_error ?? null,
    rankMath: m.rank_math === true,
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const { data, error } = await supabase.from("wordpress_sites").select("id, site_name, site_url, metadata").order("created_at", { ascending: true });
  if (error) return apiError(error.message, 500);

  // One-time look for Rank Math on sites not yet connected (result is remembered).
  const rows = await Promise.all((data ?? []).map(async (site) => {
    const m = (site.metadata ?? {}) as Meta & Record<string, unknown>;
    if (m.indexnow_verified_at || m.rank_math !== undefined) return site;
    const found = await detectRankMath(site.site_url as string);
    if (found === null) return site; // couldn't check; try again next time
    const next = { ...m, rank_math: found };
    await supabase.from("wordpress_sites").update({ metadata: next }).eq("id", site.id);
    return { ...site, metadata: next };
  }));
  return NextResponse.json({ sites: rows.map(shape) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const rl = await limitRequestAsync(request, "seo-indexnow", 20, 60_000);
  if (!rl.ok) return apiError("Too many checks — please wait a minute.", 429);

  const body = await readJsonBody<{ siteId?: string; key?: string }>(request);
  if (!body || typeof body.siteId !== "string") return apiError("Choose a site.", 400);

  const { data: site } = await supabase.from("wordpress_sites").select("id, site_name, site_url, metadata").eq("id", body.siteId).maybeSingle();
  if (!site) return apiError("That site was not found in your account.", 404);

  const meta = (site.metadata ?? {}) as Meta & Record<string, unknown>;
  const provided = typeof body.key === "string" ? body.key.trim() : "";
  if (provided && !isValidIndexNowKey(provided)) return apiError("A key must be 8–128 letters, numbers or dashes.", 400);
  const key = provided || meta.indexnow_key || generateIndexNowKey();

  const check = await verifyIndexNowKeyFile(site.site_url as string, key);
  const next = {
    ...meta,
    indexnow_key: key,
    indexnow_verified_at: check.verified ? new Date().toISOString() : null,
    indexnow_error: check.verified ? null : check.reason ?? "Key file not found.",
  };
  const { error } = await supabase.from("wordpress_sites").update({ metadata: next }).eq("id", site.id);
  if (error) return apiError(error.message, 500);

  return NextResponse.json({ site: shape({ ...site, metadata: next }) });
}
