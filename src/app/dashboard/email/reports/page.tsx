import { EmailSummaryReport } from "@/components/email/EmailPanels";

export const metadata = { title: "Email Reports — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Daily attention summaries with suggested next actions.</p>
      </div>
      <EmailSummaryReport />
    </div>
  );
}
