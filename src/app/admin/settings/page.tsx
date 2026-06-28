import { AdminSettings } from "@/components/admin/AdminSettings";
export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Settings</h1>
      <AdminSettings />
    </div>
  );
}
