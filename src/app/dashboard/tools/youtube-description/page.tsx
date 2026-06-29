import { TextToolPanel } from "@/components/dashboard/TextToolPanel";
export const metadata = { title: "YouTube Description Generator" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">YouTube Description Generator</h1><p className="mt-1 text-muted-foreground">Full YouTube descriptions with a hook, summary, and hashtags.</p></div>
      <TextToolPanel tool="youtube-description" inputLabel="Video topic" placeholder="e.g. puppy training basics" buttonLabel="Generate descriptions" />
    </div>
  );
}
