/**
 * POST /api/publishing/publish
 * Publish a finished project to one or more destinations. Live providers
 * (WordPress/WooCommerce/webhook) publish for real; not-yet-live destinations
 * return a ready-to-use export package. Each destination is tracked
 * independently. Publishing itself is free — AI optimization is charged separately.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPublish, type PublishRequest } from "@/lib/publishing/orchestrate";
import { getCapability } from "@/config/publishingCapabilities";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as PublishRequest;
  const cap = getCapability(body.contentType);
  if (!cap) return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
  const destinations = (body.destinations ?? []).filter((d) => cap.publishDestinations.includes(d));
  if (destinations.length === 0) return NextResponse.json({ error: "Select at least one destination." }, { status: 400 });

  const { jobId, results } = await runPublish(supabase, user.id, { ...body, destinations, scheduleFor: null });

  const published = results.filter((r) => r.status === "published").length;
  const ready = results.filter((r) => r.status === "export_ready").length;
  const failed = results.filter((r) => r.status === "failed").length;
  return NextResponse.json({ jobId, results, summary: { published, ready, failed } });
}
