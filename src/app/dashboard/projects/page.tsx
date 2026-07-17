import Link from "next/link";
import { PlusCircle, FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { CategoryIcon } from "@/components/icons/CategoryIcon";

export const metadata = { title: "Projects — CreatorsForge AI" };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, category, idea, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-muted-foreground">All of your content projects in one place.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/new">
            <PlusCircle className="h-4 w-4" /> New project
          </Link>
        </Button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const cat = CATEGORIES.find((c) => c.slug === p.category);
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                <Card className="h-full transition-colors hover:border-brand-600">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-900 text-brand-300 dark:bg-brand-950/50 dark:text-brand-300">
                      <CategoryIcon slug={cat?.slug} className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">
                      {p.status}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold">{p.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {p.idea || cat?.name}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">You don&apos;t have any projects yet.</p>
          <Button asChild>
            <Link href="/dashboard/projects/new">Create your first project</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
