/**
 * GET /api/publishing/capabilities?contentType=ai_video
 * Returns the capability matrix (optionally for one content type) annotated with
 * which destinations the user has connected. Read-only, free, owner-scoped.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConnectedAccounts, capabilitySummary } from "@/lib/publishing/unified";
import { PUBLISHING_CAPABILITIES, type ContentTypeId } from "@/config/publishingCapabilities";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contentType = searchParams.get("contentType") as ContentTypeId | null;
  const accounts = await getConnectedAccounts(supabase);

  if (contentType) {
    const summary = capabilitySummary(contentType, accounts);
    if (!summary) return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
    return NextResponse.json({ summary, accounts });
  }

  // Full matrix (labels + studios only — clients fetch per-type for details).
  const matrix = Object.values(PUBLISHING_CAPABILITIES).map((c) => ({
    id: c.id, label: c.label, studio: c.studio,
    publishDestinations: c.publishDestinations, adPlatforms: c.adPlatforms, exportFormats: c.exportFormats,
  }));
  return NextResponse.json({ matrix, accounts });
}
