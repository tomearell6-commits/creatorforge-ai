import { SocialAccounts } from "@/components/dashboard/SocialAccounts";

export const metadata = { title: "Social Accounts" };

export default function SocialPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Accounts</h1>
        <p className="mt-1 text-muted-foreground">
          Connect the platforms you publish to. Connections, status, and expiry are shown per account.
        </p>
      </div>
      <SocialAccounts />
    </div>
  );
}
