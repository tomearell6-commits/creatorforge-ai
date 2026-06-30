import { AdCampaignCalendar } from "@/components/ads/AdCampaignCalendar";
export const metadata = { title: "Campaign Calendar — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-bold">Campaign Calendar</h1><p className="mt-1 text-muted-foreground">Track campaigns across their lifecycle stages.</p></div>
      <AdCampaignCalendar />
    </div>
  );
}
