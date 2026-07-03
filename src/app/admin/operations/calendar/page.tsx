import { OpsCalendar } from "@/components/admin/operations/OpsMisc";

export const metadata = { title: "Renewal Calendar" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Renewal Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Renewals, key rotations and review dates on a calendar.</p>
      </div>
      <OpsCalendar />
    </div>
  );
}
