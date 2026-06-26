import { createClient } from "@/lib/supabase/server";
import { ScriptGenerator } from "@/components/dashboard/ScriptGenerator";

export const metadata = { title: "Script Generator — CreatorForge AI" };

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectId } = await searchParams;
  const supabase = await createClient();

  // Load the user's projects so they can attach the generated script to one.
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, category, idea")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Script generator</h1>
        <p className="mt-1 text-muted-foreground">
          Turn an idea into a structured script. Choose a category, tone, and length — real
          AI generations cost 1 credit; the placeholder engine is free.
        </p>
      </div>
      <ScriptGenerator projects={projects ?? []} initialProjectId={projectId} />
    </div>
  );
}
