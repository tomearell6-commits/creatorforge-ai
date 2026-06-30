import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAvatarProvider } from "@/lib/avatar";
import { captureError } from "@/lib/logger";

/** POST { script, avatarId?, voiceId? } — start an avatar tutorial render. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const provider = getAvatarProvider();
  if (!provider.isConfigured()) {
    return NextResponse.json({ error: `Avatar provider "${provider.id}" is not configured. Set its API key (e.g. HEYGEN_API_KEY) and AVATAR_PROVIDER.` }, { status: 400 });
  }
  const { script, avatarId, voiceId } = (await request.json().catch(() => ({}))) as { script?: string; avatarId?: string; voiceId?: string };
  if (!script?.trim()) return NextResponse.json({ error: "Script is required." }, { status: 400 });

  try {
    const job = await provider.createVideo({ script: script.trim(), avatarId, voiceId });
    return NextResponse.json(job);
  } catch (e) {
    captureError(e, { category: "api", feature: "avatar", stage: "generate" });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Generation failed." }, { status: 502 });
  }
}
