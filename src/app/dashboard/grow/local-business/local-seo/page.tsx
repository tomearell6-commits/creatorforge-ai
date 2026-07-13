import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LocalSEOPlanner } from "@/components/local-business/LocalSEOPlanner";

export const metadata = { title: "Local SEO Planner — Local Business Studio" };

export default function LbLocalSeoPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Local SEO Planner</h1>
        <p className="mt-1 text-muted-foreground">Plan weeks or a month of local content — posts, service topics, seasonal campaigns, FAQ, blog, and landing-page ideas.</p>
      </div>
      <LocalSEOPlanner />
    </div>
  );
}
