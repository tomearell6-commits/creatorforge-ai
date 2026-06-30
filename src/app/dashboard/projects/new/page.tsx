import { createProject } from "../actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { CATEGORIES } from "@/lib/constants";

export const metadata = { title: "New Project — CreatorForge AI" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ idea?: string; category?: string }>;
}) {
  const { idea, category } = await searchParams;
  const validCategory = CATEGORIES.some((c) => c.slug === category) ? category : "";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New project</h1>
        <p className="mt-1 text-muted-foreground">
          Pick a category and describe your idea. We&apos;ll take you straight to the generator.
        </p>
      </div>

      <Card>
        <form action={createProject} className="space-y-5">
          <div>
            <Label htmlFor="title">Project title</Label>
            <Input id="title" name="title" placeholder="e.g. The Haunted Lighthouse" required />
          </div>

          <div>
            <Label htmlFor="category">Content category</Label>
            <select
              id="category"
              name="category"
              required
              defaultValue={validCategory}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="" disabled>
                Select a category…
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="idea">Content idea</Label>
            <Textarea
              id="idea"
              name="idea"
              rows={4}
              defaultValue={idea ?? ""}
              placeholder="Describe the story, topic, or angle you want to create…"
            />
          </div>

          <Button type="submit" className="w-full">
            Create &amp; generate
          </Button>
        </form>
      </Card>
    </div>
  );
}
