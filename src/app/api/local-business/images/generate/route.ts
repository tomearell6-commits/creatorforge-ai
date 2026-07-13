/**
 * POST /api/local-business/images/generate { prompt, postId?, width?, height? }
 * Generates a branded AI image (reuses the Design Studio FLUX generator),
 * rehosts it to storage, optionally attaches it to a post. Credit-metered.
 * Only original AI assets — never copies competitor designs.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { generateDesignImage } from "@/lib/design/image";
import { uploadFromUrl } from "@/lib/media/storage";

export const maxDuration = 120;
const IMAGE_COST = 5;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { prompt?: string; postId?: string; width?: number; height?: number };
  if (!body.prompt?.trim()) return NextResponse.json({ error: "An image prompt is required." }, { status: 400 });

  const balance = await getCreditBalance();
  if (balance < IMAGE_COST) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: IMAGE_COST, balance }, { status: 402 });

  let generated;
  try {
    generated = await generateDesignImage(body.prompt.trim().slice(0, 800), { width: body.width ?? 1200, height: body.height ?? 900 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Image generation failed." }, { status: 502 });
  }

  let url = generated.url;
  try {
    const up = await uploadFromUrl(supabase, { userId: user.id, type: "design", sourceUrl: generated.url, ext: "jpg" });
    url = up.url;
  } catch { /* keep provider url if rehost fails */ }

  if (generated.usedAI) await deductCredits(IMAGE_COST, "local_business_image");
  const charged = generated.usedAI ? IMAGE_COST : 0;

  if (body.postId) {
    await supabase.from("local_business_posts").update({ image_url: url, updated_at: new Date().toISOString() }).eq("id", body.postId);
    await supabase.from("local_business_post_assets").insert({ user_id: user.id, post_id: body.postId, kind: "image", url, prompt: body.prompt });
  }

  return NextResponse.json({ url, charged });
}
