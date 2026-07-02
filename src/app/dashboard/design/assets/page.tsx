import { DesignAssetLibrary } from "@/components/design/DesignAssetLibrary";

export const metadata = { title: "Design Assets — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Design assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Reusable images and backgrounds for your designs.</p>
      </div>
      <DesignAssetLibrary />
    </div>
  );
}
