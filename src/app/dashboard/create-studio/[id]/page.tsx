import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateStudioFlow } from "@/components/studio/CreateStudioFlow";

export const metadata = { title: "Create Studio — CreatorsForge AI" };
// Per-user, per-project data — never statically prerender. Keeps this heavy
// route out of the build-time static-generation phase.
export const dynamic = "force-dynamic";

/**
 * The unified Create Studio — one guided template that carries a project
 * through the whole production journey (Script → Voiceover → Video → Preview →
 * Schedule & Publish) in a single page, instead of the old scattered pages.
 */
export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const { step } = await searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, category, idea, status")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const [{ data: scripts }, { data: scenes }, { data: subtitle }, { data: voiceovers }, { data: jobs }] =
    await Promise.all([
      supabase.from("generated_scripts").select("id, content, model, created_at").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("scenes").select("*").eq("project_id", id).order("position", { ascending: true }),
      supabase.from("subtitles").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("voiceovers").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("render_jobs").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    ]);

  return (
    <CreateStudioFlow
      project={project}
      scripts={scripts ?? []}
      latestScriptText={scripts?.[0]?.content ?? ""}
      scenes={scenes ?? []}
      subtitle={subtitle ?? null}
      voiceovers={voiceovers ?? []}
      renderJobs={jobs ?? []}
      renderLive={!!process.env.SHOTSTACK_API_KEY}
      initialStep={step}
    />
  );
}
