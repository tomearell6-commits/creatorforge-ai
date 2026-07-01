import { CampaignReportCards } from "@/components/leads/CampaignReportCards";
import { LeadAccessGate } from "@/components/leads/LeadAccessGate";

export const metadata = { title: "Lead Reports — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lead Reports</h1>
        <p className="mt-1 text-muted-foreground">Track lead quality, outreach performance, and credit usage.</p>
      </div>
      <LeadAccessGate need="view">
        <CampaignReportCards />
      </LeadAccessGate>
    </div>
  );
}
