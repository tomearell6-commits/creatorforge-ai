import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { cacheGet, cacheSet } from "@/lib/gsc/google";
import { listSites } from "@/lib/gsc/sites";
import { readPage } from "@/lib/gsc/pagefetch";
import { askJson } from "@/lib/seo/research/analyze";
import { isHealthTopic } from "@/lib/seo/health";

/**
 * POST /api/seo/gsc/suggest { host, url, queries: string[] }
 * Better title and description for one page, from what the page really says and the real searches that
 * find it. 2 credits, charged only when suggestions come back (free on the CreatorsForge blog).
 * Suggestions are kept 7 days per page so asking again never charges twice.
 */
export const maxDuration = 90;
const COST = 2;
const TTL = 7 * 24 * 60 * 60_000;

type Suggestion = { titles: string[]; description: string; notes: string; current: { title: string; description: string } };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const rl = await limitRequestAsync(request, "gsc-suggest", 10, 60_000);
  if (!rl.ok) return apiError("Too many requests. Please wait a minute.", 429);

  const body = await readJsonBody<{ host?: string; url?: string; queries?: string[] }>(request);
  if (!body || typeof body.host !== "string" || typeof body.url !== "string") return apiError("Send a website and a page.", 400);
  const host = body.host.toLowerCase();
  let pageHost = "";
  try { pageHost = new URL(body.url).hostname.toLowerCase(); } catch { return apiError("That page address is not valid.", 400); }

  const admin = await isPlatformAdmin();
  const sites = await listSites(supabase, admin.ok);
  const site = sites.find((s) => s.host === host);
  if (!site || pageHost.replace(/^www\./, "") !== host.replace(/^www\./, "")) return apiError("That page is not on one of your Autopilot websites.", 404);

  const db = createAdminClient();
  const cached = await cacheGet<Suggestion>(db, user.id, "suggest", body.url, TTL);
  if (cached) return NextResponse.json({ state: "ok", ...cached, cached: true, charged: 0 });

  const free = site.kind === "blog";
  if (!free) {
    const { data: prof } = await db.from("profiles").select("credits").eq("user_id", user.id).maybeSingle();
    if ((prof?.credits ?? 0) < COST) return apiError(`Not enough credits (${COST} needed).`, 402);
  }

  const page = await readPage(body.url);
  if (!page) return apiError("Could not read that page right now. Please try again.", 502);

  // The writer rules of the matching Autopilot site (what the business really offers) apply to titles too.
  const { data: wps } = await supabase.from("wordpress_sites").select("id, site_url");
  const wpId = (wps ?? []).find((w) => { try { return new URL(w.site_url as string).hostname.toLowerCase().replace(/^www\./, "") === host.replace(/^www\./, ""); } catch { return false; } })?.id;
  const { data: auto } = wpId ? await supabase.from("seo_autopost_sites").select("writer_rules").eq("wordpress_site_id", wpId).maybeSingle() : { data: null };
  const rules = ((auto?.writer_rules as string | undefined) ?? "").slice(0, 1200);

  const queries = (Array.isArray(body.queries) ? body.queries : []).filter((q) => typeof q === "string").map((q) => q.slice(0, 120)).slice(0, 6);
  const health = isHealthTopic(page.title, page.h1, page.text.slice(0, 600));

  let out: { titles?: string[]; description?: string; notes?: string };
  try {
    out = await askJson<{ titles?: string[]; description?: string; notes?: string }>(
      "You are a careful SEO editor. Improve the search-result title and meta description of ONE existing page so that more of the people who already see it in Google click it. " +
        "Return a JSON object {titles:string[](exactly 3 options, each 45-60 characters, different angles),description:string(130-155 characters),notes:string(one or two plain sentences on why)}. " +
        "RULES: be accurate to what the page really contains; use the main search the page already appears for, naturally and near the start; no clickbait, no ALL CAPS, no exclamation marks, no made-up numbers, prices, years or claims; never promise results or guarantees; " +
        "write in the page's own language and voice. " + (health ? "This is health-related: educational wording only, no cures, dosing or treatment claims. " : "") +
        (rules ? `BUSINESS RULES (never contradict, never imply anything the business does not offer): ${rules}` : ""),
      JSON.stringify({ url: body.url, currentTitle: page.title, currentDescription: page.description, h1: page.h1, sections: page.headings, opening: page.text.slice(0, 1200), searchesThatAlreadyFindThisPage: queries }),
      1500, "suggest", [],
    );
  } catch {
    return apiError("Could not write suggestions right now. Nothing was charged. Please try again.", 502);
  }
  const titles = (out.titles ?? []).filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim().slice(0, 80)).slice(0, 3);
  const description = typeof out.description === "string" ? out.description.trim().slice(0, 200) : "";
  if (titles.length === 0 || !description) return apiError("The suggestions came back incomplete. Nothing was charged. Please try again.", 502);

  const result: Suggestion = { titles, description, notes: typeof out.notes === "string" ? out.notes.trim().slice(0, 300) : "", current: { title: page.title, description: page.description } };
  await cacheSet(db, user.id, "suggest", body.url, result);
  if (!free) await db.rpc("wallet_adjust", { p_user: user.id, p_amount: -COST, p_type: "generation", p_reason: "seo_quick_win" });
  return NextResponse.json({ state: "ok", ...result, cached: false, charged: free ? 0 : COST });
}
