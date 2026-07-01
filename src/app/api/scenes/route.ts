import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { splitScriptIntoScenes } from "@/lib/media/scenes";
import { apiError, readJsonBody } from "@/lib/api/respond";

/**
 * POST   /api/scenes  -> (re)build scenes for a project from its latest script.
 * PATCH  /api/scenes  -> update a single scene, or reorder ({ order: [ids] }).
 */

async function requireUserAndProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) return { error: "Project not found", status: 404 as const };
  return { supabase, user };
}

export async function POST(request: Request) {
  const body = await readJsonBody<{ projectId?: string }>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  const { projectId } = body;
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const ctx = await requireUserAndProject(projectId);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { supabase, user } = ctx;

  // Use the most recent saved script for this project.
  const { data: script } = await supabase
    .from("generated_scripts")
    .select("id, content")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!script) {
    return NextResponse.json(
      { error: "Save a generated script to this project first.", code: "no_script" },
      { status: 400 }
    );
  }

  const parsed = splitScriptIntoScenes(script.content);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "Could not derive scenes from the script." }, { status: 422 });
  }

  // Replace any existing scenes for this project.
  await supabase.from("scenes").delete().eq("project_id", projectId);

  const rows = parsed.map((s) => ({
    user_id: user.id,
    project_id: projectId,
    script_id: script.id,
    position: s.position,
    title: s.title,
    text: s.narration,
    visual_description: s.visual_description,
    image_prompt: s.image_prompt,
    video_prompt: s.video_prompt,
    camera_direction: s.camera_direction,
    transition: s.transition,
    duration: s.duration,
  }));

  const { data: scenes, error } = await supabase.from("scenes").insert(rows).select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ scenes });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Reorder mode: { order: [sceneId, ...] }
  if (Array.isArray(body.order)) {
    await Promise.all(
      body.order.map((id: string, index: number) =>
        supabase.from("scenes").update({ position: index }).eq("id", id).eq("user_id", user.id)
      )
    );
    return NextResponse.json({ ok: true });
  }

  // Single-scene update.
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Scene id is required" }, { status: 400 });

  const allowed = [
    "title",
    "text",
    "visual_description",
    "image_prompt",
    "video_prompt",
    "camera_direction",
    "transition",
    "duration",
  ];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) if (key in fields) update[key] = fields[key];

  const { data, error } = await supabase
    .from("scenes")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ scene: data });
}
