import { AdminLeads } from "@/components/admin/AdminLeads";

export const metadata = { title: "Lead Generator — Admin" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lead Generator</h1>
        <p className="mt-1 text-muted-foreground">
          Provider usage, credit consumption, and compliance activity across all lead campaigns.
        </p>
      </div>
      <AdminLeads />
    </div>
  );
}
