import { AdminNotifications } from "@/components/admin/AdminNotifications";

export const metadata = { title: "Notifications — Admin" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="mt-1 text-muted-foreground">
          Delivery health, alert stats, and notification rules.
        </p>
      </div>
      <AdminNotifications />
    </div>
  );
}
