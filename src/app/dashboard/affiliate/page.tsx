import { AffiliateCenter } from "@/components/dashboard/AffiliateCenter";
export const metadata = { title: "Affiliate Center" };
export default function AffiliatePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Affiliate Center</h1>
        <p className="mt-1 text-muted-foreground">Earn recurring commission for every customer you refer.</p>
      </div>
      <AffiliateCenter />
    </div>
  );
}
