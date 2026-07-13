import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LocalBusinessPosts } from "@/components/local-business/LocalBusinessPosts";

export const metadata = { title: "Publishing Queue — Local Business Studio" };

export default function LbPublishingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Publishing Queue</h1>
        <p className="mt-1 text-muted-foreground">All your posts and their status. Live Google publishing activates once Business Profile API access is approved.</p>
      </div>
      <LocalBusinessPosts mode="queue" />
    </div>
  );
}
