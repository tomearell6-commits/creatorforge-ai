/**
 * POST /api/social-business/schedule { projectId?, destinations:[{platform, variationId?, scheduleFor}] }
 * Schedules selected platforms (lands in the Publishing Calendar). Free.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSocialPublish, type SocialDestination } from "@/lib/social/publish";
import { SOCIAL_PROVIDERS } from "@/config/socialProviderCapabilities";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { projectId?: string; campaignId?: string; destinations?: SocialDestination[] };
  const destinations = (body.destinations ?? []).filter((d) => d.platform in SOCIAL_PROVIDERS && d.scheduleFor && !isNaN(Date.parse(d.scheduleFor)));
  if (destinations.length === 0) return NextResponse.json({ error: "Pick platforms and valid future times." }, { status: 400 });

  const results = await runSocialPublish(supabase, user.id, { projectId: body.projectId, campaignId: body.campaignId, destinations, schedule: true });
  return NextResponse.json({ results });
}
