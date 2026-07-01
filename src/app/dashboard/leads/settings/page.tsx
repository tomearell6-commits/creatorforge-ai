import { LeadSettings } from "@/components/leads/LeadSettings";

export const metadata = { title: "Lead Generator Settings — CreatorForge AI" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lead Generator Settings</h1>
        <p className="mt-1 text-muted-foreground">Provider status, credit costs, and compliance.</p>
      </div>
      <LeadSettings />
    </div>
  );
}
