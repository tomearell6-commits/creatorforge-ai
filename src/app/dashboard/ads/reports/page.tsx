import { AdCampaignReports } from "@/components/ads/AdCampaignReports";
export const metadata = { title: "Campaign Reports — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Campaign Reports</h1><p className="mt-1 text-muted-foreground">Performance metrics, where the platform&apos;s API supports reporting.</p></div>
      <AdCampaignReports />
    </div>
  );
}
