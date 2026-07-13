/**
 * POST /api/social-business/images/generate { prompt, variationId?, width?, height? }
 * Generates a branded image (reuses Design Studio FLUX), rehosts to storage, and
 * optionally attaches it to a content variation. Credit-metered. Original assets only.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { generateDesignImage } from "@/lib/design/image";
import { uploadFromUrl } from "@/lib/media/storage";
import { SOCIAL_CREDIT_COSTS } from "@/config/socialContentCapabilities";

export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { prompt?: string; variationId?: string; projectId?: string; width?: number; height?: number };
  if (!body.prompt?.trim()) return NextResponse.json({ error: "An image prompt is required." }, { status: 400 });

  const cost = SOCIAL_CREDIT_COSTS.image;
  const balance = await getCreditBalance();
  if (balance < cost) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: cost, balance }, { status: 402 });

  let generated;
  try { generated = await generateDesignImage(body.prompt.trim().slice(0, 800), { width: body.width ?? 1080, height: body.height ?? 1080 }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Image generation failed." }, { status: 502 }); }

  let url = generated.url;
  try { url = (await uploadFromUrl(supabase, { userId: user.id, type: "design", sourceUrl: generated.url, ext: "jpg" })).url; } catch { /* keep provider url */ }

  if (generated.usedAI) await deductCredits(cost, "social_image");
  const charged = generated.usedAI ? cost : 0;

  if (body.variationId) await supabase.from("social_content_variations").update({ image_url: url }).eq("id", body.variationId);
  await supabase.from("social_media_assets").insert({ user_id: user.id, project_id: body.projectId ?? null, kind: "image", url, prompt: body.prompt });

  return NextResponse.json({ url, charged });
}
