import { AdminTeam } from "@/components/admin/AdminTeam";

export const metadata = { title: "Team & Admins" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team &amp; Admins</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who can access the CreatorsForge admin portal.
        </p>
      </div>
      <AdminTeam />
    </div>
  );
}
