import { EmailNotificationSettings } from "@/components/email/EmailPanels";

export const metadata = { title: "Email Settings — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Permission modes, notifications, disconnect, and data deletion.</p>
      </div>
      <EmailNotificationSettings />
    </div>
  );
}
