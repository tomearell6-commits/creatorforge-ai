import { CreateHub } from "@/components/dashboard/CreateHub";
import { AreaHub } from "@/components/dashboard/AreaHub";

export const metadata = { title: "Create — CreatorsForge AI" };

/**
 * The Create area. When arriving with ?group= (links across the platform use
 * this to open a specific tool family) we show the category hub directly;
 * otherwise the area overview comes first with the full hub below it.
 */
export default async function CreatePage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams;
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {!group && <AreaHub areaId="create" />}
      <div>
        <h2 className="text-lg font-semibold">{group ? "Create Content" : "Browse all content categories"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every content tool on the platform — pick a category and start.
        </p>
        <div className="mt-4">
          <CreateHub initialGroup={group} />
        </div>
      </div>
    </div>
  );
}
