import { WeeklyReport } from "@/components/dashboard/WeeklyReport";

export const metadata = { title: "Weekly Report — CreatorForge AI" };

export default function WeeklyReportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Weekly Report</h1>
        <p className="mt-1 text-muted-foreground">
          A full breakdown of your credits, content, publishing, and automation activity.
        </p>
      </div>
      <WeeklyReport />
    </div>
  );
}
