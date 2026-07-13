import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LocalBusinessReport } from "@/components/local-business/LocalBusinessReport";

export const metadata = { title: "Reports — Local Business Studio" };

export default function LbReportsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-muted-foreground">Generate a performance report from your available data, with AI recommendations. Honest — no invented metrics.</p>
      </div>
      <LocalBusinessReport />
    </div>
  );
}
