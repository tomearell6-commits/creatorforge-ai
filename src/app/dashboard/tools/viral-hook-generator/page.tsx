import { TextToolPanel } from "@/components/dashboard/TextToolPanel";
export const metadata = { title: "Viral Hook Generator" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Viral Hook Generator</h1><p className="mt-1 text-muted-foreground">Scroll-stopping opening hooks for short-form video.</p></div>
      <TextToolPanel tool="viral-hooks" inputLabel="Video topic" placeholder="e.g. how to train a puppy" buttonLabel="Generate hooks" />
    </div>
  );
}
