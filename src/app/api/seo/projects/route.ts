import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCreditBalance } from "@/lib/credits";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { normalizeWebsite } from "@/lib/seo/research/analyze";
import { runProjectAnalysis } from "@/lib/seo/research/project";
import { SEO_ANALYSIS_CREDITS } from "@/lib/seo/autopost/limits";

/**
 * SEO Autopilot websites.
 *  GET  → the user's websites with their analysis status
 *  POST { url } → start (or re-run) the analysis of a website. It runs in the background
 *        (about 2 minutes); the dashboard polls GET /api/seo/projects/[id] for progress.
 */
export const maxDuration = 300;

const LIST_COLUMNS = "id, website_url, name, status, progress, error, brand, analyzed_at, updated_at";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const { data, error } = await supabase.from("seo_projects").select(LIST_COLUMNS).not("website_url", "is", null).order("created_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ projects: data ?? [], analysisCredits: SEO_ANALYSIS_CREDITS, balance: await getCreditBalance() });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const rl = await limitRequestAsync(request, "seo-analyze", 6, 60 * 60_000);
  if (!rl.ok) return apiError("You've started several analyses in the last hour. Please wait a little.", 429);

  const body = await readJsonBody<{ url?: string }>(request);
  if (!body || typeof body.url !== "string") return apiError("Enter your website address.", 400);

  let origin: string;
  try { origin = await normalizeWebsite(body.url); }
  catch (e) { return apiError(e instanceof Error ? e.message : "That address doesn't look right.", 400); }

  if ((await getCreditBalance()) < SEO_ANALYSIS_CREDITS) {
    return NextResponse.json({ error: `Analysing a website costs ${SEO_ANALYSIS_CREDITS} credits and your balance is too low.`, code: "insufficient_credits" }, { status: 402 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("seo_projects").select("id, status, updated_at").eq("user_id", user.id).eq("website_url", origin).maybeSingle();

  // Already being analysed (and recently started)? Don't start it twice.
  if (existing?.status === "analyzing" && Date.now() - new Date(existing.updated_at as string).getTime() < 8 * 60_000) {
    return NextResponse.json({ project: { id: existing.id, status: "analyzing" } });
  }

  const startedAt = new Date().toISOString();
  let projectId = existing?.id as string | undefined;
  if (projectId) {
    await admin.from("seo_projects").update({ status: "analyzing", progress: "Starting…", error: null, updated_at: startedAt }).eq("id", projectId);
  } else {
    const { data: created, error } = await admin.from("seo_projects")
      .insert({ user_id: user.id, name: new URL(origin).hostname, website_url: origin, status: "analyzing", progress: "Starting…", updated_at: startedAt })
      .select("id").single();
    if (error || !created) return apiError(error?.message ?? "Could not start the analysis.", 500);
    projectId = created.id as string;
  }

  const id = projectId;
  after(() => runProjectAnalysis(admin, id, user.id, origin));
  return NextResponse.json({ project: { id, status: "analyzing" } }, { status: 202 });
}
