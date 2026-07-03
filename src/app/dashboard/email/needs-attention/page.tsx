import { NeedsAttentionTable } from "@/components/email/EmailPanels";

export const metadata = { title: "Needs Attention — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Needs Attention</h1>
        <p className="mt-1 text-sm text-muted-foreground">Emails that need action, sorted by priority and deadline.</p>
      </div>
      <NeedsAttentionTable />
    </div>
  );
}
