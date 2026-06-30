import { AdAudienceLibrary } from "@/components/ads/AdAudienceLibrary";
export const metadata = { title: "Audience Library — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Audience Library</h1><p className="mt-1 text-muted-foreground">Save and reuse target audiences across campaigns.</p></div>
      <AdAudienceLibrary />
    </div>
  );
}
