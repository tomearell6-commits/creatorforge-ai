import { TextToolPanel } from "@/components/dashboard/TextToolPanel";
export const metadata = { title: "Landing Page Copy Generator" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Landing Page Copy Generator</h1><p className="mt-1 text-muted-foreground">Generate headlines, subheadlines, benefit bullets, and CTAs for a high-converting landing page.</p></div>
      <TextToolPanel tool="landing-copy" inputLabel="Product / offer" placeholder="e.g. AI invoicing app for freelancers" buttonLabel="Generate landing copy" />
    </div>
  );
}
