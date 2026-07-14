import { SocialAccounts } from "@/components/dashboard/SocialAccounts";

export const metadata = { title: "Social Accounts" };

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; detail?: string }>;
}) {
  const { connected, error, detail } = await searchParams;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Accounts</h1>
        <p className="mt-1 text-muted-foreground">
          Connect the platforms you publish to. Connections, status, and expiry are shown per account.
        </p>
      </div>
      <SocialAccounts connected={connected} error={error} detail={detail} />
    </div>
  );
}
