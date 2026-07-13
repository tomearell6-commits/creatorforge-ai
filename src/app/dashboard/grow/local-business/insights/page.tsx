import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BusinessInsightsDashboard } from "@/components/local-business/BusinessInsightsDashboard";

export const metadata = { title: "Business Insights — Local Business Studio" };

export default function LbInsightsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Business Insights</h1>
        <p className="mt-1 text-muted-foreground">Your activity today, plus Google profile metrics that activate once Business Profile API access is approved. Nothing is fabricated.</p>
      </div>
      <BusinessInsightsDashboard />
    </div>
  );
}
