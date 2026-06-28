import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Projects, videos, publishing, credits, and storage at a glance.</p>
      </div>
      <AnalyticsCharts />
    </div>
  );
}
