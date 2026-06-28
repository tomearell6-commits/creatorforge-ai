import { AdminDashboard } from "@/components/admin/AdminDashboard";
export default function AdminHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Dashboard</h1>
      <AdminDashboard />
    </div>
  );
}
