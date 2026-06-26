import { createClient } from "@/lib/supabase/server";
import { AssetLibrary } from "@/components/dashboard/AssetLibrary";

export const metadata = { title: "Asset Library — CreatorForge AI" };

export default async function AssetsPage() {
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Asset Library</h1>
        <p className="mt-1 text-muted-foreground">
          All your generated images, audio, video, thumbnails, and subtitle files.
        </p>
      </div>
      <AssetLibrary assets={assets ?? []} />
    </div>
  );
}
