import Link from "next/link";
import { Clapperboard, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ScriptGenerator } from "@/components/dashboard/ScriptGenerator";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Script Generator — CreatorsForge AI" };

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

      {/* Guided-flow banner — this page is the standalone script tool; Create
          Studio carries the same script all the way to publish in one place. */}
      <div className="flex flex-col gap-3 rounded-xl border border-brand-500/30 bg-brand-50/50 p-4 dark:bg-brand-900/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Clapperboard className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <p className="text-sm font-semibold">Want the full guided flow?</p>
            <p className="text-sm text-muted-foreground">
              Create Studio takes you from script → voiceover → video → preview → schedule &amp; publish, all on one page.
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={projectId ? `/dashboard/create-studio/${projectId}` : "/dashboard/projects/new"}>
            Open Create Studio <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <ScriptGenerator projects={projects ?? []} initialProjectId={projectId} />
    </div>
  );
}
