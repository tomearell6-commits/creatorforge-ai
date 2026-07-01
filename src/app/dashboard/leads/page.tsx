import { LeadCampaignDashboard } from "@/components/leads/LeadCampaignDashboard";
import { LeadAccessGate } from "@/components/leads/LeadAccessGate";
import { ComplianceDashboard } from "@/components/leads/ComplianceDashboard";

export const metadata = { title: "Lead Generator — CreatorForge AI" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lead Generator</h1>
        <p className="mt-1 text-muted-foreground">Find public business leads, verify emails, and run compliant outreach.</p>
      </div>
      <LeadAccessGate need="view">
        <ComplianceDashboard />
        <LeadCampaignDashboard />
      </LeadAccessGate>
    </div>
  );
}
