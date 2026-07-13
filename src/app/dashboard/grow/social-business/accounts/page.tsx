import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialBusinessDashboard } from "@/components/social-business/SocialBusinessDashboard";

export const metadata = { title: "Connected Accounts — Social Business Studio" };

export default function SocialAccountsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Connected Accounts</h1>
        <p className="mt-1 text-muted-foreground">Connect, reconnect, or disconnect your platforms. Official OAuth only — tokens are encrypted and never shown to the browser.</p>
      </div>
      <SocialBusinessDashboard />
    </div>
  );
}
