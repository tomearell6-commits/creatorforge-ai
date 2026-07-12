/**
 * POST /api/publishing/schedule
 * Same as publish, but with a future `scheduleFor` datetime. Live providers that
 * support native scheduling (WordPress) schedule for real; others store a
 * scheduled export package that surfaces in the Publishing Calendar.
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
  if (!body.scheduleFor || isNaN(Date.parse(body.scheduleFor))) {
    return NextResponse.json({ error: "A valid schedule date/time is required." }, { status: 400 });
  }
  if (Date.parse(body.scheduleFor) < Date.now()) {
    return NextResponse.json({ error: "Schedule time must be in the future." }, { status: 400 });
  }
  const destinations = (body.destinations ?? []).filter((d) => cap.publishDestinations.includes(d));
  if (destinations.length === 0) return NextResponse.json({ error: "Select at least one destination." }, { status: 400 });

  const { jobId, results } = await runPublish(supabase, user.id, { ...body, destinations });
  return NextResponse.json({ jobId, results });
}
