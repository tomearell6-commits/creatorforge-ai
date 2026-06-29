import { TextToolPanel } from "@/components/dashboard/TextToolPanel";
export const metadata = { title: "Keyword Content Planner" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Keyword Content Planner</h1><p className="mt-1 text-muted-foreground">Generate a mix of head and long-tail keyword ideas with search intent for any topic.</p></div>
      <TextToolPanel tool="keyword-planner" inputLabel="Topic / seed keyword" placeholder="e.g. indoor home gardening" buttonLabel="Generate keyword plan" />
    </div>
  );
}
