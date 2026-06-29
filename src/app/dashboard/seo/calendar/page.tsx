import { SeoBlogCalendar } from "@/components/dashboard/SeoBlogCalendar";
export const metadata = { title: "Blog Calendar" };
export default function BlogCalendarPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-bold">Blog Calendar</h1><p className="mt-1 text-muted-foreground">Scheduled and published SEO articles across your WordPress sites.</p></div>
      <SeoBlogCalendar />
    </div>
  );
}
