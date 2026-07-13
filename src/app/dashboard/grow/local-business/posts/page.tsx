import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BusinessPostGenerator } from "@/components/local-business/BusinessPostGenerator";

export const metadata = { title: "Post Generator — Local Business Studio" };

export default function LbPostsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Post Generator</h1>
        <p className="mt-1 text-muted-foreground">Generate professional Google Business Profile posts with an image, then schedule or publish them.</p>
      </div>
      <BusinessPostGenerator />
    </div>
  );
}
