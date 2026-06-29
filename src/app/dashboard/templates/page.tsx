import { TemplatesGallery } from "@/components/dashboard/TemplatesGallery";

export const metadata = { title: "Templates — CreatorForge AI" };

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Filter by studio, workflow, platform, or output — every template opens the matching unified workflow.
        </p>
      </div>
      <TemplatesGallery initialGroup={group} />
    </div>
  );
}
