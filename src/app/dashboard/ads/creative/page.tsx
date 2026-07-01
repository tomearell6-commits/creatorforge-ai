import { AdCreativeStudio } from "@/components/ads/AdCreativeStudio";
export const metadata = { title: "Ad Creative Studio — CreatorsForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Ad Creative Studio</h1><p className="mt-1 text-muted-foreground">Generate headlines, primary text, descriptions, CTAs, hooks, prompts, and A/B variations.</p></div>
      <AdCreativeStudio />
    </div>
  );
}
