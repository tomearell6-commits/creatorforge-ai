import { LeadCampaignForm } from "@/components/leads/LeadCampaignForm";
import { LeadAccessGate } from "@/components/leads/LeadAccessGate";
import { LeadStepNav } from "@/components/leads/LeadStepNav";

export const metadata = { title: "New Lead Search — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Lead Search</h1>
        <p className="mt-1 text-muted-foreground">Search public sources for business contacts, then verify and organize them.</p>
      </div>
      <LeadAccessGate need="search">
        <LeadCampaignForm />
      </LeadAccessGate>
      <LeadStepNav current="find" />
    </div>
  );
}
