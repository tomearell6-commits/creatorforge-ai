/**
 * POST /api/publishing/prepare
 * Prepare per-destination metadata for a content type. If `optimize` is true we
 * generate platform-specific copy with AI (credit-metered, pre-estimated);
 * otherwise we echo the base metadata (free). Never publishes anything.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCapability, type ContentTypeId, type PublishDestinationId } from "@/config/publishingCapabilities";
import { optimizeForDestination } from "@/lib/publishing/optimize";
import { getCreditBalance, deductCredits } from "@/lib/credits";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    contentType: ContentTypeId; destinations: PublishDestinationId[];
    base?: { title?: string; description?: string; caption?: string; hashtags?: string[] };
    optimize?: boolean;
  };
  const cap = getCapability(body.contentType);
  if (!cap) return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
  const destinations = (body.destinations ?? []).filter((d) => cap.publishDestinations.includes(d));
  if (destinations.length === 0) return NextResponse.json({ error: "No valid destinations" }, { status: 400 });
  const base = body.base ?? {};

  // Charge only when actually running AI optimization.
  let charged = 0;
  if (body.optimize) {
    const per = cap.creditEstimate.optimize ?? 2;
    const cost = per * destinations.length;
    const balance = await getCreditBalance();
    if (balance < cost) {
      return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: cost, balance }, { status: 402 });
    }
    const nb = await deductCredits(cost, "publishing_optimize");
    if (nb === null) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits" }, { status: 402 });
    charged = cost;
  }

  const results = [];
  for (const destination of destinations) {
    const meta = body.optimize
      ? await optimizeForDestination(body.contentType, destination, base)
      : { title: base.title ?? "", description: base.description ?? "", caption: base.caption ?? base.description ?? "", hashtags: base.hashtags ?? [] };
    results.push({ destination, meta });
  }

  return NextResponse.json({ optimized: !!body.optimize, charged, results });
}
