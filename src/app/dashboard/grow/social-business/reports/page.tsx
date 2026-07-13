import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialReportViewer } from "@/components/social-business/SocialReportViewer";

export const metadata = { title: "Reports — Social Business Studio" };

export default function SocialReportsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/social-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Social Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-muted-foreground">Generate a social performance report from available data with AI recommendations. Honest — no invented provider metrics.</p>
      </div>
      <SocialReportViewer />
    </div>
  );
}
