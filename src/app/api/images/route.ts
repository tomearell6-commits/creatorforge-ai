import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getImageProvider } from "@/lib/media/providers";
import { uploadMedia } from "@/lib/media/storage";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";

/**
 * POST /api/images -> generate a scene image, store the asset, link it to the
 * scene (role: image) and set scenes.image_url.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, sceneId, prompt } = await request.json();
  if (!projectId || !prompt) {
    return NextResponse.json({ error: "projectId and prompt are required" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const provider = getImageProvider();
  const billable = provider.id !== "placeholder";
  if (billable && (await getCreditBalance()) < CREDIT_COSTS.image) {
    return NextResponse.json(
      { error: "Not enough credits. Upgrade your plan to keep generating.", code: "insufficient_credits" },
      { status: 402 }
    );
  }

  let result;
  let upload;
  try {
    result = await provider.generate({ prompt, seed: sceneId || prompt });
    upload = await uploadMedia(supabase, {
      userId: user.id,
      type: "image",
      bytes: result.data,
      contentType: result.contentType,
      ext: result.contentType.includes("png") ? "png" : "jpg",
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Image generation failed" }, { status: 502 });
  }

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      user_id: user.id,
      project_id: projectId,
      type: "image",
      name: `Scene image — ${project.title}`,
      url: upload.url,
      mime_type: result.contentType,
      size_bytes: upload.size,
      provider: result.provider,
      metadata: { prompt, width: result.width, height: result.height, path: upload.path },
    })
    .select("id")
    .single();
  if (assetError) return NextResponse.json({ error: assetError.message }, { status: 500 });

  if (sceneId) {
    await supabase
      .from("scene_assets")
      .upsert(
        { user_id: user.id, scene_id: sceneId, asset_id: asset.id, role: "image" },
        { onConflict: "scene_id,role" }
      );
    await supabase.from("scenes").update({ image_url: upload.url }).eq("id", sceneId);
  }

  const creditsRemaining = billable ? await deductCredits(CREDIT_COSTS.image, "image") : null;

  return NextResponse.json({ url: upload.url, assetId: asset.id, creditsRemaining });
}
