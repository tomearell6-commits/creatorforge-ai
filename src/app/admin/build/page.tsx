import { AdminBuild } from "@/components/admin/AdminBuild";

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Build Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Usage metrics and template management.</p>
      </div>
      <AdminBuild />
    </div>
  );
}
