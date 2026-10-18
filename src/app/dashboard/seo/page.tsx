import Link from "next/link";
import { SeoDashboard } from "@/components/dashboard/SeoDashboard";
export const metadata = { title: "SEO Writer" };
export default function SeoStudioHome() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">SEO Writer</h1><p className="mt-1 text-muted-foreground">Write and publish one SEO article at a time.</p></div>
      <div className="rounded-xl border border-brand-600 bg-brand-50 p-4 text-sm dark:bg-brand-950/20">
        <strong>Want this automatic?</strong> SEO Autopilot studies your website and competitors, plans 30 days of articles and publishes one every day.{" "}
        <Link href="/dashboard/seo/autopilot" className="font-semibold underline">Open SEO Autopilot →</Link>
      </div>
      <SeoDashboard />
    </div>
  );
}
