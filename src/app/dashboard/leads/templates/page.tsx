import { OutreachTemplateEditor } from "@/components/leads/OutreachTemplateEditor";

export const metadata = { title: "Outreach Templates — CreatorForge AI" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Outreach Templates</h1>
        <p className="mt-1 text-muted-foreground">Draft the emails your campaigns will send. An unsubscribe footer is always appended.</p>
      </div>
      <OutreachTemplateEditor />
    </div>
  );
}
