import { AdminUsers } from "@/components/admin/AdminUsers";
export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>
      <AdminUsers />
    </div>
  );
}
