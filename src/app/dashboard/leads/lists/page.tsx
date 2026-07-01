import { LeadLists } from "@/components/leads/LeadLists";
import { LeadAccessGate } from "@/components/leads/LeadAccessGate";

export const metadata = { title: "Lead Lists — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lead Lists</h1>
        <p className="mt-1 text-muted-foreground">Group, export, and sync your leads.</p>
      </div>
      <LeadAccessGate need="search">
        <LeadLists />
      </LeadAccessGate>
    </div>
  );
}
