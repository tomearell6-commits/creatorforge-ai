import { TextToolPanel } from "@/components/dashboard/TextToolPanel";
export const metadata = { title: "FAQ Generator" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">FAQ Generator</h1><p className="mt-1 text-muted-foreground">Generate ready-to-publish FAQ questions and answers for any topic or product.</p></div>
      <TextToolPanel tool="faq" inputLabel="Topic / product" placeholder="e.g. electric mountain bikes" buttonLabel="Generate FAQs" />
    </div>
  );
}
