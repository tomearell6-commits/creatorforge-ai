/**
 * POST /api/social-business/publish  { projectId?, destinations:[{platform, variationId?}] }
 * Publishes selected platforms. Per-platform independent. Live providers publish
 * for real; not-yet-approved providers return honest "unavailable" (never faked).
 * Free (publishing itself isn't a paid AI action).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSocialPublish, type SocialDestination } from "@/lib/social/publish";
import { SOCIAL_PROVIDERS } from "@/config/socialProviderCapabilities";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { projectId?: string; campaignId?: string; destinations?: SocialDestination[] };
  const destinations = (body.destinations ?? []).filter((d) => d.platform in SOCIAL_PROVIDERS);
  if (destinations.length === 0) return NextResponse.json({ error: "Select at least one platform." }, { status: 400 });

  const results = await runSocialPublish(supabase, user.id, { projectId: body.projectId, campaignId: body.campaignId, destinations, schedule: false });
  return NextResponse.json({ results });
}
