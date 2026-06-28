import { NotificationsList } from "@/components/dashboard/NotificationsList";

export const metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="mt-1 text-muted-foreground">Renders, publishing results, credits, and account alerts.</p>
      </div>
      <NotificationsList />
    </div>
  );
}
