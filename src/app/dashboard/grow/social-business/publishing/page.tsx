import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialPublishingQueue } from "@/components/social-business/SocialPublishingQueue";

export const metadata = { title: "Publishing Queue — Social Business Studio" };

export default function SocialPublishingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Publishing Queue</h1>
        <p className="mt-1 text-muted-foreground">Every platform job and its status. Live posting activates per platform once its app is approved.</p>
      </div>
      <SocialPublishingQueue mode="queue" />
    </div>
  );
}
