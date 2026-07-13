/**
 * GET /api/local-business/insights?locationId=
 * Honest Business Insights: metrics we can serve from our own data (posts,
 * scheduled, reviews, audit score) are real; Google profile metrics (views,
 * calls, direction requests, search appearances) are marked UNAVAILABLE until
 * live Business Profile Performance API access is approved. Never fabricated.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gbpApiConfigured } from "@/lib/local-business/service";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locationId = new URL(request.url).searchParams.get("locationId");
  if (!locationId) return NextResponse.json({ error: "locationId is required." }, { status: 400 });

  const [{ count: published }, { count: scheduled }, { count: reviews }, { data: loc }] = await Promise.all([
    supabase.from("local_business_posts").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("status", "published"),
    supabase.from("local_business_posts").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("status", "scheduled"),
    supabase.from("local_business_reviews").select("id", { count: "exact", head: true }).eq("location_id", locationId),
    supabase.from("local_business_locations").select("audit_score").eq("id", locationId).single(),
  ]);

  const own = [
    { id: "posts_published", label: "Posts published", value: published ?? 0, available: true },
    { id: "posts_scheduled", label: "Posts scheduled", value: scheduled ?? 0, available: true },
    { id: "reviews_tracked", label: "Reviews tracked", value: reviews ?? 0, available: true },
    { id: "profile_health", label: "Profile Health Score", value: loc?.audit_score ?? null, available: true },
  ];
  const gated = ["Profile interactions", "Website clicks", "Calls", "Direction requests", "Search appearances", "Photo activity"]
    .map((label) => ({ id: label.toLowerCase().replace(/\s+/g, "_"), label, value: null, available: gbpApiConfigured() }));

  return NextResponse.json({ own, gated, liveApi: gbpApiConfigured() });
}
