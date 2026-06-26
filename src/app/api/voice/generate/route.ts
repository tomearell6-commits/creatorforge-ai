import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVoiceProvider } from "@/lib/media/providers";
import { uploadMedia } from "@/lib/media/storage";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";

/**
 * POST /api/voice/generate -> synthesize a voiceover, store the audio asset and
 * a voiceovers row. Links to a scene when sceneId is provided.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, sceneId, text, voiceId, language, accent, speed, pitch } =
    await request.json();
  if (!projectId || !text) {
    return NextResponse.json({ error: "projectId and text are required" }, { status: 400 });
  }

  // Confirm project ownership.
  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const provider = getVoiceProvider();
  const billable = provider.id !== "placeholder";
  if (billable && (await getCreditBalance()) < CREDIT_COSTS.voiceover) {
    return NextResponse.json(
      { error: "Not enough credits. Upgrade your plan to keep generating.", code: "insufficient_credits" },
      { status: 402 }
    );
  }

  let result;
  try {
    result = await provider.synthesize({
      text,
      voiceId,
      language,
      accent,
      speed: Number(speed) || 1,
      pitch: Number(pitch) || 1,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice generation failed";
    return NextResponse.json(
      { error: `Voice provider error: ${message}`, code: "provider_error" },
      { status: 502 }
    );
  }

  // Upload the audio to Storage, then store the durable URL.
  let upload;
  try {
    upload = await uploadMedia(supabase, {
      userId: user.id,
      type: "audio",
      bytes: result.data,
      contentType: result.contentType,
      ext: result.contentType.includes("mpeg") ? "mp3" : "wav",
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      user_id: user.id,
      project_id: projectId,
      type: "audio",
      name: `Voiceover — ${project.title}`,
      url: upload.url,
      mime_type: result.contentType,
      size_bytes: upload.size,
      provider: result.provider,
      metadata: { voiceId, language, accent, duration: result.durationSeconds, path: upload.path },
    })
    .select("id")
    .single();
  if (assetError) return NextResponse.json({ error: assetError.message }, { status: 500 });

  const { data: voiceover, error: voError } = await supabase
    .from("voiceovers")
    .insert({
      user_id: user.id,
      project_id: projectId,
      scene_id: sceneId ?? null,
      asset_id: asset.id,
      provider: result.provider,
      voice_id: voiceId,
      language,
      accent,
      speed: Number(speed) || 1,
      pitch: Number(pitch) || 1,
      text,
      audio_url: upload.url,
      duration: result.durationSeconds,
      status: "ready",
    })
    .select("*")
    .single();
  if (voError) return NextResponse.json({ error: voError.message }, { status: 500 });

  // Link to the scene timeline when applicable.
  if (sceneId) {
    await supabase
      .from("scene_assets")
      .upsert(
        { user_id: user.id, scene_id: sceneId, asset_id: asset.id, role: "voice" },
        { onConflict: "scene_id,role" }
      );
    await supabase.from("scenes").update({ voice_url: upload.url }).eq("id", sceneId);
  }

  const creditsRemaining = billable
    ? await deductCredits(CREDIT_COSTS.voiceover, "voiceover")
    : null;

  return NextResponse.json({ voiceover, assetId: asset.id, creditsRemaining });
}
