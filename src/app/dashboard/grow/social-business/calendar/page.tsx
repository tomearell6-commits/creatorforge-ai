import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialPublishingQueue } from "@/components/social-business/SocialPublishingQueue";

export const metadata = { title: "Publishing Calendar — Social Business Studio" };

export default function SocialCalendarPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Publishing Calendar</h1>
        <p className="mt-1 text-muted-foreground">Your scheduled posts across every platform. These also appear in the platform-wide Publishing Calendar.</p>
      </div>
      <SocialPublishingQueue mode="calendar" />
    </div>
  );
}
