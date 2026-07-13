import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Settings — Social Business Studio" };

export default function SocialSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Connections, automation, and provider setup.</p>
      </div>

      <Card className="p-5">
        <p className="text-sm">Manage your platform connections in <Link href="/dashboard/grow/social-business/accounts" className="text-brand-600 hover:underline">Connected Accounts</Link>.</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2"><Info className="h-4 w-4 text-brand-600" /><h2 className="text-sm font-semibold">Enabling live publishing per platform</h2></div>
        <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Register a developer app for each platform (Meta, LinkedIn, TikTok, YouTube/Google, Pinterest, X).</li>
          <li>Request the minimum permissions and pass that platform&rsquo;s app review (Meta business verification, LinkedIn Marketing Developer Platform, TikTok Content Posting API, etc.).</li>
          <li>Add each app&rsquo;s client ID/secret to CreatorsForge (admin), then connect the account here.</li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">Until a platform&rsquo;s app is approved, its live publishing/reads are gated — you can still create, schedule, and export content. We never simulate a successful post.</p>
      </Card>
    </div>
  );
}
