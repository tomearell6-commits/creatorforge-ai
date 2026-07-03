import { EmailDashboard } from "@/components/email/EmailDashboard";

export const metadata = { title: "Inbox Summary — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inbox Summary</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your scanned inbox, classified by category and priority.</p>
      </div>
      <EmailDashboard />
    </div>
  );
}
