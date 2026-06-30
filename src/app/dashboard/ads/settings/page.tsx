import { AdSettings } from "@/components/ads/AdSettings";
export const metadata = { title: "Advertising Settings — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Advertising Settings</h1><p className="mt-1 text-muted-foreground">Credit costs and platform capabilities.</p></div>
      <AdSettings />
    </div>
  );
}
