import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutopostForSite } from "@/lib/seo/autopost/run";

/**
 * Worker: publishes one post for one site. Called by the hourly scheduler
 * (/api/cron/seo-autopost) with the CRON_SECRET bearer token. Own 5-minute budget.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const site = new URL(request.url).searchParams.get("site");
  if (!site) return NextResponse.json({ error: "Missing site" }, { status: 400 });

  const outcome = await runAutopostForSite(createAdminClient(), site);
  return NextResponse.json({ site, ...outcome });
}
