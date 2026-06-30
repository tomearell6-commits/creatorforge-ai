import { AdsDashboard } from "@/components/ads/AdsDashboard";
export const metadata = { title: "AI Advertising Studio — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">AI Advertising Studio</h1><p className="mt-1 text-muted-foreground">Create campaigns, generate AI creatives, and manage your advertising in one workspace.</p></div>
      <AdsDashboard />
    </div>
  );
}
