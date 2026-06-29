import { HashtagGenerator } from "@/components/dashboard/HashtagGenerator";
export const metadata = { title: "Hashtag Generator" };
export default function HashtagGeneratorPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-bold">Hashtag Generator</h1><p className="mt-1 text-muted-foreground">Generate broad, niche, and long-tail hashtag sets for any platform.</p></div>
      <HashtagGenerator />
    </div>
  );
}
