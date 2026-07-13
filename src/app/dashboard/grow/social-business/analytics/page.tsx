import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CrossPlatformAnalytics } from "@/components/social-business/CrossPlatformAnalytics";

export const metadata = { title: "Analytics — Social Business Studio" };

export default function SocialAnalyticsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Your activity today, plus platform metrics that activate once each provider&rsquo;s analytics API is approved. Nothing is fabricated.</p>
      </div>
      <CrossPlatformAnalytics />
    </div>
  );
}
