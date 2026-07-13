import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialInbox } from "@/components/social-business/SocialInbox";

export const metadata = { title: "AI Reply Assistant — Social Business Studio" };

export default function SocialRepliesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">AI Reply Assistant</h1>
        <p className="mt-1 text-muted-foreground">Draft replies in your chosen tone. Never auto-sent — sensitive topics (complaints, legal, refunds) are flagged for your approval.</p>
      </div>
      <SocialInbox />
    </div>
  );
}
