import { AdCreativeLibrary } from "@/components/ads/AdCreativeLibrary";
export const metadata = { title: "Creative Library — CreatorsForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Creative Library</h1><p className="mt-1 text-muted-foreground">Search, reuse, archive, and delete your saved ad creatives.</p></div>
      <AdCreativeLibrary />
    </div>
  );
}
