import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReviewReplyEditor } from "@/components/local-business/ReviewReplyEditor";

export const metadata = { title: "Review Reply Assistant — Local Business Studio" };

export default function LbReviewsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Review Reply Assistant</h1>
        <p className="mt-1 text-muted-foreground">Draft professional review responses. Replies are never auto-published; negative and sensitive reviews are flagged for your approval.</p>
      </div>
      <ReviewReplyEditor />
    </div>
  );
}
