import { OpsStorage } from "@/components/admin/operations/OpsMisc";

export const metadata = { title: "Database & Storage" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Database & Storage</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live row counts plus capacity tracking for Supabase.</p>
      </div>
      <OpsStorage />
    </div>
  );
}
