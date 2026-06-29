import { TextToolPanel } from "@/components/dashboard/TextToolPanel";
export const metadata = { title: "Meta Description Generator" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Meta Description Generator</h1><p className="mt-1 text-muted-foreground">Generate compelling SEO meta descriptions (≤155 chars) for any page.</p></div>
      <TextToolPanel tool="meta-descriptions" inputLabel="Keyword / topic" placeholder="e.g. best dog food for puppies" buttonLabel="Generate meta descriptions" />
    </div>
  );
}
