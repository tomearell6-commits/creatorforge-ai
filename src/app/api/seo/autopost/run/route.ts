import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { runAutopostForSite } from "@/lib/seo/autopost/run";

/** "Post one now" — runs today's post immediately for one of the user's sites. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const rl = await limitRequestAsync(request, "seo-autopost-run", 6, 60 * 60_000);
  if (!rl.ok) return apiError("Too many manual runs. Please wait a little — automatic posting continues on schedule.", 429);

  const body = await readJsonBody<{ id?: string }>(request);
  if (!body || typeof body.id !== "string") return apiError("Missing id.", 400);

  // RLS: only the owner can see this row.
  const { data: own } = await supabase.from("seo_autopost_sites").select("id").eq("id", body.id).maybeSingle();
  if (!own) return apiError("Not found.", 404);

  const outcome = await runAutopostForSite(createAdminClient(), body.id, { force: true });
  return NextResponse.json(outcome);
}
