import { AdLaunchPanel } from "@/components/ads/AdLaunchPanel";

export const metadata = { title: "Launch & Export — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Launch &amp; Export</h1>
        <p className="mt-1 text-muted-foreground">
          Set your budget, authorize spend, and launch — or export a ready-to-paste brief into each platform&rsquo;s Ads Manager.
        </p>
      </div>
      <AdLaunchPanel />
    </div>
  );
}
