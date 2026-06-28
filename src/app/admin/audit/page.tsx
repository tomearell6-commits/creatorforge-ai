import { AdminAudit } from "@/components/admin/AdminAudit";
export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <AdminAudit />
    </div>
  );
}
