import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVoiceProvider } from "@/lib/media/providers";

/** POST /api/voice/preview -> synthesize a short, unsaved voice sample. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, voiceId, language, accent, speed, pitch } = await request.json();

  const provider = getVoiceProvider();
  const result = await provider.synthesize({
    text: (text || "This is a preview of the selected voice.").slice(0, 300),
    voiceId,
    language,
    accent,
    speed: Number(speed) || 1,
    pitch: Number(pitch) || 1,
    preview: true,
  });

  // Previews are ephemeral — return an inline data URI rather than storing.
  const audioUrl = `data:${result.contentType};base64,${Buffer.from(result.data).toString("base64")}`;
  return NextResponse.json({ audioUrl, durationSeconds: result.durationSeconds, voiceId });
}
