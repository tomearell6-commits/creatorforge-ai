import { AdminEmailAssistant } from "@/components/admin/AdminEmailAssistant";

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Email Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Usage metrics only — user email content is never visible to admins.
        </p>
      </div>
      <AdminEmailAssistant />
    </div>
  );
}
