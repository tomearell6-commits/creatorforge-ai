import { AdminMonitoring } from "@/components/admin/AdminMonitoring";
export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Health</h1>
      <AdminMonitoring />
    </div>
  );
}
