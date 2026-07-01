import { BrevoCampaigns } from "@/components/leads/BrevoCampaigns";
import { LeadAccessGate } from "@/components/leads/LeadAccessGate";

export const metadata = { title: "Email Campaigns — CreatorForge AI" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Campaigns</h1>
        <p className="mt-1 text-muted-foreground">Sync leads to Brevo and send outreach campaigns.</p>
      </div>
      <LeadAccessGate need="send">
        <BrevoCampaigns />
      </LeadAccessGate>
    </div>
  );
}
