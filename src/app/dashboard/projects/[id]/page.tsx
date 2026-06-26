import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { deleteProject } from "../actions";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: scripts } = await supabase
    .from("generated_scripts")
    .select("id, content, model, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const cat = CATEGORIES.find((c) => c.slug === project.category);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {cat?.emoji} {cat?.name} · {formatDate(project.created_at)}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{project.title}</h1>
          {project.idea && <p className="mt-2 text-muted-foreground">{project.idea}</p>}
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{project.status}</span>
      </div>

      <div className="flex gap-2">
        <Button asChild>
          <Link href={`/dashboard/generate?project=${project.id}`}>
            <Sparkles className="h-4 w-4" /> Generate script
          </Link>
        </Button>
        <form action={deleteProject}>
          <input type="hidden" name="id" value={project.id} />
          <Button type="submit" variant="outline">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        <CardTitle>Generated scripts</CardTitle>
        {scripts && scripts.length > 0 ? (
          scripts.map((s) => (
            <Card key={s.id}>
              <p className="mb-2 text-xs text-muted-foreground">
                {s.model} · {formatDate(s.created_at)}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm">{s.content}</pre>
            </Card>
          ))
        ) : (
          <Card className="text-sm text-muted-foreground">
            No scripts yet. Use the generator to create one.
          </Card>
        )}
      </div>
    </div>
  );
}
