import { CreateHub } from "@/components/dashboard/CreateHub";
export const metadata = { title: "Create — CreatorForge AI" };
export default async function CreatePage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Content</h1>
        <p className="mt-1 text-muted-foreground">Every tool from the homepage lives here — pick a studio, choose a tool, and start.</p>
      </div>
      <CreateHub initialGroup={group} />
    </div>
  );
}
