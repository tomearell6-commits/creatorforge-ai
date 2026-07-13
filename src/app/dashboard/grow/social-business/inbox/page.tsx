import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialInbox } from "@/components/social-business/SocialInbox";

export const metadata = { title: "Inbox & Enquiries — Social Business Studio" };

export default function SocialInboxPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Inbox &amp; Enquiries</h1>
        <p className="mt-1 text-muted-foreground">Classify messages, comments, and enquiries and draft professional replies. Live inbox retrieval activates per platform once approved.</p>
      </div>
      <SocialInbox />
    </div>
  );
}
