import { LeadCampaignForm } from "@/components/leads/LeadCampaignForm";

export const metadata = { title: "New Lead Search — CreatorForge AI" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Lead Search</h1>
        <p className="mt-1 text-muted-foreground">Search public sources for business contacts, then verify and organize them.</p>
      </div>
      <LeadCampaignForm />
    </div>
  );
}
