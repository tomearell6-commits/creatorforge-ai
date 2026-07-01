import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getImageProvider } from "@/lib/media/providers";
import { uploadMedia } from "@/lib/media/storage";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { apiError, readJsonBody } from "@/lib/api/respond";

/**
 * POST /api/thumbnails -> generate a 16:9 thumbnail image, store the asset and
 * a thumbnails row (title + style are editable; the title overlays the image
 * in the UI).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "thumbnails-generate", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const body = await readJsonBody<{ projectId?: string; title?: string; style?: string; prompt?: string }>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  const { projectId, title, style, prompt } = body;
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const fullPrompt = `${style || "bold"} YouTube thumbnail — ${prompt || title || project.title}`;
  const provider = getImageProvider();
  const billable = provider.id !== "placeholder";
  if (billable && (await getCreditBalance()) < CREDIT_COSTS.thumbnail) {
    return NextResponse.json(
      { error: "Not enough credits. Upgrade your plan to keep generating.", code: "insufficient_credits" },
      { status: 402 }
    );
  }

  let result;
  let upload;
  try {
    result = await provider.generate({ prompt: fullPrompt, width: 1280, height: 720 });
    upload = await uploadMedia(supabase, {
      userId: user.id,
      type: "thumbnail",
      bytes: result.data,
      contentType: result.contentType,
      ext: result.contentType.includes("png") ? "png" : "jpg",
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Thumbnail generation failed" }, { status: 502 });
  }

  const { data: asset } = await supabase
    .from("assets")
    .insert({
      user_id: user.id,
      project_id: projectId,
      type: "thumbnail",
      name: `Thumbnail — ${title || project.title}`,
      url: upload.url,
      mime_type: result.contentType,
      size_bytes: upload.size,
      provider: result.provider,
      metadata: { title, style, path: upload.path },
    })
    .select("id")
    .single();

  const { data: thumbnail, error } = await supabase
    .from("thumbnails")
    .insert({
      user_id: user.id,
      project_id: projectId,
      asset_id: asset?.id ?? null,
      title: title || project.title,
      style: style || "bold",
      prompt: fullPrompt,
      image_url: upload.url,
      width: 1280,
      height: 720,
      status: "ready",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const creditsRemaining = billable ? await deductCredits(CREDIT_COSTS.thumbnail, "thumbnail") : null;

  return NextResponse.json({ thumbnail, creditsRemaining });
}
