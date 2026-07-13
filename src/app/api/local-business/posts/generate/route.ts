/**
 * POST /api/local-business/posts/generate
 * Generate a Google Business Profile post (text + image prompt + variations) and
 * save it as a draft. Credit-metered (post, or post_with_image if withImage).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeLb } from "@/lib/local-business/service";
import { generateBusinessPost, type PostInput } from "@/lib/local-business/posts";
import { LB_POST_TYPES, type LbPostType } from "@/config/localBusiness";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as PostInput & { locationId?: string; withImage?: boolean };
  if (!body.locationId) return NextResponse.json({ error: "Select a business location." }, { status: 400 });
  if (!LB_POST_TYPES.includes(body.postType as LbPostType)) return NextResponse.json({ error: "Unknown post type." }, { status: 400 });

  const { data: loc } = await supabase.from("local_business_locations").select("business_name, primary_category").eq("id", body.locationId).single();
  if (!loc) return NextResponse.json({ error: "Location not found." }, { status: 404 });

  const charge = await chargeLb(body.withImage ? "post_with_image" : "post");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const out = await generateBusinessPost(loc.business_name, loc.primary_category, body);

  const { data: post, error } = await supabase.from("local_business_posts").insert({
    user_id: user.id, location_id: body.locationId, post_type: body.postType, topic: body.topic ?? null,
    main_text: out.mainText, short_text: out.shortText, cta: out.cta,
    offer_json: out.offerDetails ? { details: out.offerDetails } : {},
    event_json: out.eventDetails ? { details: out.eventDetails } : {},
    image_prompt: out.imagePrompt, status: "draft", credits_used: charge.charged,
  }).select("id").single();
  if (error || !post) return NextResponse.json({ error: error?.message ?? "Save failed" }, { status: 500 });

  return NextResponse.json({ postId: post.id, charged: charge.charged, post: out });
}
