import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialContentGenerator } from "@/components/social-business/SocialContentGenerator";

export const metadata = { title: "Content Generator — Social Business Studio" };

export default function SocialContentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Content Generator</h1>
        <p className="mt-1 text-muted-foreground">One idea → platform-specific versions, each tuned to its platform. Add AI images, then schedule or publish.</p>
      </div>
      <SocialContentGenerator />
    </div>
  );
}
