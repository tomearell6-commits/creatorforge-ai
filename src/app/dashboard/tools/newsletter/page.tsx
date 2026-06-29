import { TextToolPanel } from "@/components/dashboard/TextToolPanel";
export const metadata = { title: "Newsletter Summary" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Newsletter Summary</h1><p className="mt-1 text-muted-foreground">Turn any topic into ready-to-send newsletter summaries with subject lines.</p></div>
      <TextToolPanel tool="newsletter" inputLabel="Topic / theme" placeholder="e.g. this week in AI marketing" buttonLabel="Generate newsletter" />
    </div>
  );
}
