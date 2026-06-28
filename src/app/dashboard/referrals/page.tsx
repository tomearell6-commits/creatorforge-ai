import { ReferralCenter } from "@/components/dashboard/ReferralCenter";
export const metadata = { title: "Referrals" };
export default function ReferralsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referral Center</h1>
        <p className="mt-1 text-muted-foreground">Invite friends and earn reward credits when they subscribe.</p>
      </div>
      <ReferralCenter />
    </div>
  );
}
