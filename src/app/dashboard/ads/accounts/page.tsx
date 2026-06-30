import { ConnectedAdAccounts } from "@/components/ads/ConnectedAdAccounts";
export const metadata = { title: "Connected Ad Accounts — CreatorForge AI" };
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Connected Ad Accounts</h1><p className="mt-1 text-muted-foreground">Connect supported advertising accounts via their official APIs.</p></div>
      <ConnectedAdAccounts />
    </div>
  );
}
