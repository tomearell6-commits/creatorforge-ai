import { MetaTitleGenerator } from "@/components/dashboard/MetaTitleGenerator";
export const metadata = { title: "Meta Title Generator" };
export default function MetaTitleGeneratorPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Meta Title Generator</h1><p className="mt-1 text-muted-foreground">Generate SEO-optimized title + meta description options for any keyword.</p></div>
      <MetaTitleGenerator />
    </div>
  );
}
