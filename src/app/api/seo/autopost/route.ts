import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plan";
import { getCreditBalance } from "@/lib/credits";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { assignPublishHours } from "@/lib/seo/autopost/schedule";
import { CREDITS_PER_POST, estimateMonthlyCredits, siteLimitForPlan } from "@/lib/seo/autopost/limits";

/**
 * SEO Auto-Poster settings for the signed-in user.
 *  GET    → their auto-posted sites, recent activity, plan limit, credit cost
 *  POST   → start auto-posting to a connected WordPress site { wordpressSiteId, niche, postsPerDay }
 *  PATCH  → change { id, active?, postsPerDay?, niche?, minWords? }
 *  DELETE → stop and remove { id }
 * Users never set a date or time — hours are assigned automatically.
 */
const COLUMNS = "id, project_id, wordpress_site_id, active, niche, posts_per_day, audience, language, min_words, publish_hours, posts_published, consecutive_failures, paused_reason, last_run_at, last_success_at, created_at, topic_queue";

function cleanNiche(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const n = v.replace(/\s+/g, " ").trim();
  return n.length >= 3 && n.length <= 200 ? n : null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const plan = await getUserPlan(supabase);
  const { data: rows, error } = await supabase.from("seo_autopost_sites").select(COLUMNS).order("created_at", { ascending: true });
  if (error) return apiError(error.message, 500);

  const ids = (rows ?? []).map((r) => r.id as string);
  const wpIds = (rows ?? []).map((r) => r.wordpress_site_id as string);
  const [{ data: sites }, { data: logs }] = await Promise.all([
    wpIds.length ? supabase.from("wordpress_sites").select("id, site_name, site_url, metadata").in("id", wpIds) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("seo_autopost_log").select("id, site_id, status, stage, message, title, post_url, words, created_at").in("site_id", ids).order("created_at", { ascending: false }).limit(60) : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    plan,
    siteLimit: siteLimitForPlan(plan),
    creditsPerPost: CREDITS_PER_POST,
    balance: await getCreditBalance(),
    items: (rows ?? []).map((r) => ({
      ...r,
      queued_topics: Array.isArray(r.topic_queue) ? r.topic_queue.length : 0,
      topic_queue: undefined,
      monthly_credit_estimate: estimateMonthlyCredits(r.posts_per_day as number),
      site: (() => {
        const s = (sites ?? []).find((x) => x.id === r.wordpress_site_id);
        if (!s) return null;
        const m = ((s as { metadata?: unknown }).metadata ?? {}) as { indexnow_verified_at?: string | null };
        // IndexNow is free; this flag drives the "connect IndexNow" prompt in the dashboard.
        return { id: s.id, site_name: s.site_name, site_url: s.site_url, indexnow_connected: !!m.indexnow_verified_at };
      })(),
      recent: (logs ?? []).filter((l) => l.site_id === r.id).slice(0, 5),
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const body = await readJsonBody<{ wordpressSiteId?: string; niche?: string; postsPerDay?: number; projectId?: string }>(request);
  if (!body) return apiError("Invalid JSON body", 400);

  // Started from an analysed website: take the niche, language, plan and brand from it.
  let fromProject: { id: string; niche: string; language: string; topics: unknown[]; research: Record<string, unknown> } | null = null;
  if (typeof body.projectId === "string") {
    const { data: pr } = await supabase.from("seo_projects").select("id, status, brand, competitors, keywords, gaps, plan, language").eq("id", body.projectId).maybeSingle();
    if (!pr) return apiError("That website analysis was not found.", 404);
    if (pr.status !== "ready") return apiError("The website analysis isn't finished yet.", 409);
    const brand = (pr.brand ?? {}) as { niche?: string; summary?: string };
    const plan = (Array.isArray(pr.plan) ? pr.plan : []) as { title?: string; keyword?: string; secondaryKeywords?: string[]; intent?: string; angle?: string }[];
    fromProject = {
      id: pr.id as string,
      niche: brand.niche || brand.summary || "",
      language: (pr.language as string) || "en",
      // Same shape the auto-poster's topic queue uses, plus the planned angle.
      topics: plan.filter((p) => p.keyword).map((p) => ({ keyword: p.keyword, title: p.title ?? p.keyword, secondaryKeywords: p.secondaryKeywords ?? [], intent: p.intent ?? "informational", angle: p.angle ?? "" })),
      research: { brand: pr.brand, competitors: Array.isArray(pr.competitors) ? (pr.competitors as unknown[]).slice(0, 6) : [], keywords: Array.isArray(pr.keywords) ? (pr.keywords as unknown[]).slice(0, 20) : [], gaps: pr.gaps ?? [] },
    };
  }

  const niche = cleanNiche(fromProject ? fromProject.niche : body.niche);
  if (!niche) return apiError("Describe what the website is about (3–200 characters).", 400);
  if (typeof body.wordpressSiteId !== "string") return apiError("Choose a connected WordPress site.", 400);
  const postsPerDay = body.postsPerDay === 2 ? 2 : 1;

  const plan = await getUserPlan(supabase);
  const limit = siteLimitForPlan(plan);
  if (limit === 0) return apiError("SEO Auto-Poster is available on paid plans. Upgrade to start daily automatic posting.", 403);

  // RLS guarantees this only returns the user's own sites.
  const { data: wp } = await supabase.from("wordpress_sites").select("id").eq("id", body.wordpressSiteId).maybeSingle();
  if (!wp) return apiError("That WordPress site was not found in your account.", 404);

  const { count } = await supabase.from("seo_autopost_sites").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= limit) return apiError(`Your plan allows auto-posting on ${limit} website${limit === 1 ? "" : "s"}. Upgrade to add more.`, 403);

  const { data, error } = await supabase
    .from("seo_autopost_sites")
    .insert({
      user_id: user.id, wordpress_site_id: wp.id, niche, posts_per_day: postsPerDay,
      publish_hours: assignPublishHours(postsPerDay, wp.id as string),
      ...(fromProject ? { project_id: fromProject.id, language: fromProject.language, topic_queue: fromProject.topics, research: fromProject.research } : {}),
    })
    .select(COLUMNS).single();
  if (error) {
    if (error.code === "23505") return apiError("Auto-posting is already set up for that website.", 409);
    return apiError(error.message, 500);
  }
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const body = await readJsonBody<{ id?: string; active?: boolean; postsPerDay?: number; niche?: string; minWords?: number }>(request);
  if (!body || typeof body.id !== "string") return apiError("Missing id.", 400);

  const { data: current } = await supabase.from("seo_autopost_sites").select("id, wordpress_site_id, posts_per_day").eq("id", body.id).maybeSingle();
  if (!current) return apiError("Not found.", 404);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.active === "boolean") {
    patch.active = body.active;
    if (body.active) { patch.consecutive_failures = 0; patch.paused_reason = null; patch.claimed_at = null; }
  }
  if (body.postsPerDay === 1 || body.postsPerDay === 2) {
    patch.posts_per_day = body.postsPerDay;
    patch.publish_hours = assignPublishHours(body.postsPerDay, current.wordpress_site_id as string);
  }
  if (body.niche !== undefined) {
    const n = cleanNiche(body.niche);
    if (!n) return apiError("Describe what the website is about (3–200 characters).", 400);
    patch.niche = n;
    patch.topic_queue = []; // a new niche needs a fresh topic plan
  }
  if (typeof body.minWords === "number") patch.min_words = Math.min(4000, Math.max(1500, Math.round(body.minWords)));

  const { data, error } = await supabase.from("seo_autopost_sites").update(patch).eq("id", body.id).select(COLUMNS).single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const body = await readJsonBody<{ id?: string }>(request);
  if (!body || typeof body.id !== "string") return apiError("Missing id.", 400);
  const { error } = await supabase.from("seo_autopost_sites").delete().eq("id", body.id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}
