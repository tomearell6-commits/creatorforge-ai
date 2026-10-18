import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { cacheGet, cacheSet, inspectUrl, type Inspection } from "@/lib/gsc/google";
import { resolveProperty } from "@/lib/gsc/resolve";
import { listSites } from "@/lib/gsc/sites";

/**
 * POST /api/seo/gsc/inspect  { host, urls: string[] (max 10) }
 * Asks Google whether each page is in its index (URL Inspection). Answers are kept for 12 hours:
 * Google allows about 2,000 inspections a day per website, so we never ask twice needlessly.
 */
export const maxDuration = 60;
const TTL = 12 * 60 * 60_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const rl = await limitRequestAsync(request, "gsc-inspect", 12, 60_000);
  if (!rl.ok) return apiError("Too many requests. Please wait a minute.", 429);

  const body = await readJsonBody<{ host?: string; urls?: string[] }>(request);
  if (!body || typeof body.host !== "string" || !Array.isArray(body.urls)) return apiError("Send a host and a list of pages.", 400);
  const host = body.host.toLowerCase();

  const sites = await listSites(supabase, (await isPlatformAdmin()).ok);
  if (!sites.some((s) => s.host === host)) return apiError("That website is not one of your Autopilot sites.", 404);

  // Only pages on that website, and never more than ten at a time.
  const urls = [...new Set(body.urls.filter((u) => typeof u === "string"))].filter((u) => { try { return new URL(u).hostname.toLowerCase() === host; } catch { return false; } }).slice(0, 10);
  if (urls.length === 0) return apiError("No pages to check.", 400);

  const admin = createAdminClient();
  const r = await resolveProperty(admin, user.id, host);
  if (r.state !== "ok") return NextResponse.json({ ...r });

  const results: Record<string, Inspection | { error: string }> = {};
  for (const u of urls) {
    const hit = await cacheGet<Inspection>(admin, user.id, "inspect", u, TTL);
    if (hit) { results[u] = hit; continue; }
    const res = await inspectUrl(r.token, r.property, u);
    if (!res.ok) { results[u] = { error: res.message }; continue; }
    results[u] = res.data;
    await cacheSet(admin, user.id, "inspect", u, res.data);
  }
  return NextResponse.json({ state: "ok", results });
}
