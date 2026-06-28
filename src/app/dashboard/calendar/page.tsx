import { CalendarView } from "@/components/dashboard/CalendarView";

export const metadata = { title: "Content Calendar" };

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Calendar</h1>
        <p className="mt-1 text-muted-foreground">Daily, weekly, and monthly views of your scheduled posts.</p>
      </div>
      <CalendarView />
    </div>
  );
}
