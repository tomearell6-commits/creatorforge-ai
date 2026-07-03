import { EmailDashboard } from "@/components/email/EmailDashboard";

export const metadata = { title: "AI Email Assistant — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Email Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">Stay on top of important emails — AI summaries, priorities, and draft replies you approve.</p>
      </div>
      <EmailDashboard />
    </div>
  );
}
