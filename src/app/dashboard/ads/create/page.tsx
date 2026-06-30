import { AdCampaignWizard } from "@/components/ads/AdCampaignWizard";
export const metadata = { title: "Create Campaign — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Create Campaign</h1><p className="mt-1 text-muted-foreground">Set up your campaign, then generate AI creatives.</p></div>
      <AdCampaignWizard />
    </div>
  );
}
