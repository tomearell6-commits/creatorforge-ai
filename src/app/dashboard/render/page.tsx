import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectPicker } from "@/components/dashboard/ProjectPicker";
import { RenderQueue } from "@/components/dashboard/RenderQueue";

export const metadata = { title: "Render Queue — CreatorForge AI" };

export default async function RenderPage({
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

  const { data: jobs } = await supabase
    .from("render_jobs")
    .select("*")
    .eq("project_id", selectedId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Render Queue</h1>
        <p className="mt-1 text-muted-foreground">Queue and monitor render jobs for your project.</p>
      </div>
      <ProjectPicker projects={projects} selectedId={selectedId} />
      <RenderQueue projectId={selectedId} jobs={jobs ?? []} />
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
