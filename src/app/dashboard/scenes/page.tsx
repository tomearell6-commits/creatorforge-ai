import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectPicker } from "@/components/dashboard/ProjectPicker";
import { SceneBuilder } from "@/components/dashboard/SceneBuilder";

export const metadata = { title: "Scene Builder — CreatorsForge AI" };

export default async function ScenesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .order("created_at", { ascending: false });

  if (!projects || projects.length === 0) return <NoProjects />;
  const selectedId = project && projects.some((p) => p.id === project) ? project : projects[0].id;

  const { data: scenes } = await supabase
    .from("scenes")
    .select("*")
    .eq("project_id", selectedId)
    .order("position", { ascending: true });

  const { count: scriptCount } = await supabase
    .from("generated_scripts")
    .select("id", { count: "exact", head: true })
    .eq("project_id", selectedId);

  const { data: subtitle } = await supabase
    .from("subtitles")
    .select("*")
    .eq("project_id", selectedId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scene Builder</h1>
        <p className="mt-1 text-muted-foreground">
          Break the script into scenes, edit each beat, build the timeline, and generate captions.
        </p>
        <Link href={`/dashboard/studio/${selectedId}?step=video`} className="mt-1 inline-block text-sm font-medium text-brand-600 hover:underline">
          Prefer the guided flow? Open Create Studio →
        </Link>
      </div>
      <ProjectPicker projects={projects} selectedId={selectedId} />
      <SceneBuilder
        projectId={selectedId}
        initialScenes={scenes ?? []}
        hasScript={(scriptCount ?? 0) > 0}
        initialSubtitle={subtitle ?? null}
      />
    </div>
  );
}

function NoProjects() {
  return (
    <Card className="mx-auto mt-10 max-w-md text-center">
      <p className="text-muted-foreground">Create a project to start generating media.</p>
      <Button asChild className="mt-4">
        <Link href="/dashboard/projects/new">New project</Link>
      </Button>
    </Card>
  );
}
