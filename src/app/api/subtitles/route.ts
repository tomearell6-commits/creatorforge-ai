import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCues, serializeCaptions } from "@/lib/media/subtitles";
import { uploadMedia } from "@/lib/media/storage";

/**
 * POST  /api/subtitles -> generate subtitles (SRT/VTT) from a project's scenes
 *                         (or its latest script), store subtitle + asset rows.
 * PATCH /api/subtitles -> save edited subtitle content.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, format } = await request.json();
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  const fmt: "srt" | "vtt" = format === "vtt" ? "vtt" : "srt";

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Prefer scene narration; fall back to the latest script body.
  const { data: scenes } = await supabase
    .from("scenes")
    .select("text, position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  let segments: string[] = (scenes ?? [])
    .map((s) => (s.text || "").trim())
    .filter(Boolean);

  if (segments.length === 0) {
    const { data: script } = await supabase
      .from("generated_scripts")
      .select("content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!script) {
      return NextResponse.json(
        { error: "Build scenes or save a script first.", code: "no_source" },
        { status: 400 }
      );
    }
    segments = (script.content as string)
      .split(/\r?\n/)
      .map((l: string) => l.replace(/^\[[^\]]+\]\s*/, "").trim())
      .filter((l: string) => l && !l.startsWith("#") && l !== "---" && !l.startsWith("Category:"));
  }

  const content = serializeCaptions(buildCues(segments), fmt);
  const contentType = fmt === "vtt" ? "text/vtt" : "application/x-subrip";

  let upload;
  try {
    upload = await uploadMedia(supabase, {
      userId: user.id,
      type: "subtitle",
      bytes: Buffer.from(content, "utf8"),
      contentType,
      ext: fmt,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }

  const { data: asset } = await supabase
    .from("assets")
    .insert({
      user_id: user.id,
      project_id: projectId,
      type: "subtitle",
      name: `Subtitles (${fmt.toUpperCase()}) — ${project.title}`,
      url: upload.url,
      mime_type: contentType,
      size_bytes: upload.size,
      provider: "creatorforge",
      metadata: { format: fmt, path: upload.path },
    })
    .select("id")
    .single();

  const { data: subtitle, error } = await supabase
    .from("subtitles")
    .insert({
      user_id: user.id,
      project_id: projectId,
      asset_id: asset?.id ?? null,
      format: fmt,
      content,
      language: "en",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ subtitle });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, content } = await request.json();
  if (!id || typeof content !== "string") {
    return NextResponse.json({ error: "id and content are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("subtitles")
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ subtitle: data });
}
