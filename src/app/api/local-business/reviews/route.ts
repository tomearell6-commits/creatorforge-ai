/**
 * GET  /api/local-business/reviews?locationId=  — list reviews (filters client-side)
 * POST /api/local-business/reviews               — manually add a review to draft a
 *      response for (until live Google review sync is approved). Free.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locationId = new URL(request.url).searchParams.get("locationId");
  let q = supabase.from("local_business_reviews").select("id, location_id, reviewer_name, rating, comment, review_time, answered, created_at").order("created_at", { ascending: false }).limit(100);
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q;
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { locationId?: string; reviewerName?: string; rating?: number; comment?: string };
  if (!b.locationId || !b.comment) return NextResponse.json({ error: "locationId and comment are required." }, { status: 400 });
  const { data, error } = await supabase.from("local_business_reviews").insert({
    user_id: user.id, location_id: b.locationId, reviewer_name: b.reviewerName ?? "Customer",
    rating: b.rating ?? 5, comment: b.comment, review_time: new Date().toISOString(),
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
