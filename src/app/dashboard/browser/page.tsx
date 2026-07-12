import { BrowserStudio } from "@/components/browser/BrowserStudio";

export const metadata = {
  title: "Browser Studio — CreatorsForge AI",
  description: "Inspect, preview, and optimize any web page — SEO, accessibility, snippet & Open Graph preview, and an AI Website Assistant.",
};

export default function BrowserStudioPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Browser Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inspect any page for SEO &amp; accessibility, preview its search snippet and social card, and get AI suggestions — then hand off to your other Studios.
        </p>
      </div>
      <BrowserStudio />
    </div>
  );
}
