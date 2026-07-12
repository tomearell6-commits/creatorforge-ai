import { CalendarView } from "@/components/dashboard/CalendarView";
import { PublishingActivity } from "@/components/publishing/PublishingActivity";

export const metadata = { title: "Publishing Calendar" };

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Publishing Calendar</h1>
        <p className="mt-1 text-muted-foreground">Everything you&rsquo;ve published or scheduled across every platform, in one place.</p>
      </div>
      <PublishingActivity />
      <CalendarView />
    </div>
  );
}
