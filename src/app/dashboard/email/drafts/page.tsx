import { DraftReplyEditor } from "@/components/email/EmailPanels";

export const metadata = { title: "Draft Replies — CreatorsForge AI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Draft Replies</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review, edit, approve, and send AI-prepared replies. Nothing sends without you.</p>
      </div>
      <DraftReplyEditor />
    </div>
  );
}
