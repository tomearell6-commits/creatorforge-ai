import { CampaignWizard } from "@/components/autopilot/CampaignWizard";
export const metadata = { title: "New Campaign — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">New Autopilot Campaign</h1><p className="mt-1 text-muted-foreground">A few minutes of setup — Autopilot handles the repetitive work.</p></div>
      <CampaignWizard />
    </div>
  );
}
