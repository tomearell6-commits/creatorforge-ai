import { OpsChecklist } from "@/components/admin/operations/OpsMisc";

export const metadata = { title: "Monthly Review Checklist" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monthly Review Checklist</h1>
        <p className="mt-1 text-sm text-muted-foreground">The 13-point monthly operations review.</p>
      </div>
      <OpsChecklist />
    </div>
  );
}
