import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CampaignWizard } from "@/components/social-business/CampaignWizard";

export const metadata = { title: "Campaign Builder — Social Business Studio" };

export default function SocialCampaignsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Campaign Builder</h1>
        <p className="mt-1 text-muted-foreground">One campaign → platform-specific posts. Review each platform, then publish or schedule them independently.</p>
      </div>
      <CampaignWizard />
    </div>
  );
}
