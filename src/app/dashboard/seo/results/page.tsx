import { SeoResults } from "@/components/seo/SeoResults";

export const metadata = { title: "SEO Results — CreatorsForge" };

export default function SeoResultsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SEO Results</h1>
        <p className="mt-1 text-muted-foreground">Real numbers from Google Search Console for the websites SEO Autopilot publishes to.</p>
      </div>
      <SeoResults />
    </div>
  );
}
