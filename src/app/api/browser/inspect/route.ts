import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { inspectUrl } from "@/lib/browser/inspect";
import { apiError } from "@/lib/api/respond";

export const maxDuration = 30;

/** POST { url } — inspect a page (SEO + accessibility + OG + snippet). Free
 *  (server fetch + parse, no AI). Saves to history + inspections best-effort. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "browser-inspect", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many inspections. Try again shortly." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { url?: string };
  if (!body.url || typeof body.url !== "string") return apiError("A URL is required.", 400);

  const report = await inspectUrl(body.url.trim());
  if (report.error && !report.ok) return NextResponse.json({ report }, { status: 200 }); // surfaced in UI, not an HTTP error

  // Best-effort persistence (owner-RLS). Never blocks the response.
  try {
    await supabase.from("browser_history").insert({ user_id: user.id, url: report.url, title: report.meta.title, seo_score: report.score });
    await supabase.from("browser_inspections").insert({ user_id: user.id, url: report.url, score: report.score, report });
  } catch { /* ignore */ }

  return NextResponse.json({ report });
}
