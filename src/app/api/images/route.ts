import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDesignImage, willUseRealDesignImages } from "@/lib/design/image";
import { uploadFromUrl } from "@/lib/media/storage";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { apiError, readJsonBody } from "@/lib/api/respond";

export const maxDuration = 60;

/**
 * POST /api/images -> generate a scene image (fal.ai FLUX — the same working
 * generator the Design Studio uses), rehost it to storage, store the asset,
 * link it to the scene (role: image) and set scenes.image_url.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "images-generate", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const body = await readJsonBody<{ projectId?: string; sceneId?: string; prompt?: string }>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  const { projectId, sceneId, prompt } = body;
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

  const billable = willUseRealDesignImages();
  if (billable && (await getCreditBalance()) < CREDIT_COSTS.image) {
    return NextResponse.json(
      { error: "Not enough credits. Upgrade your plan to keep generating.", code: "insufficient_credits" },
      { status: 402 }
    );
  }

  let result;
  let upload;
  try {
    // Video scenes are 16:9. fal URLs are temporary → rehost to our storage.
    result = await generateDesignImage(prompt, { width: 1280, height: 720 });
    upload = await uploadFromUrl(supabase, {
      userId: user.id,
      type: "image",
      sourceUrl: result.url,
      ext: "jpg",
      contentType: "image/jpeg",
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
      mime_type: "image/jpeg",
      size_bytes: upload.size,
      provider: result.model,
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
